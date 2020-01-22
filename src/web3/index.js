import Web3 from 'web3';
import Fulcrum from '../fulcrum'
import { iTokens } from '../fulcrum/config';

const BigNumber = require('bignumber.js');
import { DappHelperJson, mainnetAddress as DappHelperAddress } from '../fulcrum/contracts/DappHelperContract'
import { mainnetAddress as OracleAddress } from '../fulcrum/contracts/OracleContract'


const NodeCache = require("node-cache");

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });


var web3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/v3/090248ae4e924e70a074376505dcee8c'));
var DappHeperContract = new web3.eth.Contract(DappHelperJson.abi, DappHelperAddress);



export async function getAPR() {
    var result = cache.get("apr");
    if (!result) {
        result = {};
        console.warn("No apr in cache!")
        var resultPromises = iTokens.map(async token => {
            var market = new Fulcrum(token, web3);
            var apr = await market.getAPR();
            return result[token.name] = apr;
        });

        await Promise.all(resultPromises);
        cache.set("apr", result);
    }
    return result;
}


export async function getTVL() {
    var result = [];
    var tokenAddresses = iTokens.map(x => (x.address));
    var swapRates = await getSwapToUsdRateBatch(iTokens.find(x => x.name === "dai"));
    var reserveData = await DappHeperContract.methods.reserveDetails(tokenAddresses).call();

    let usdTotalLockedAll = new BigNumber(0);
    if (reserveData && reserveData.totalAssetSupply.length > 0) {
        iTokens.forEach((token, i) => {
            let asset = token.displayName;

            let totalAssetSupply = new BigNumber(reserveData[0][i]);
            let totalAssetBorrow = new BigNumber(reserveData[1][i]);
            let supplyInterestRate = new BigNumber(reserveData[2][i]);
            let borrowInterestRate = new BigNumber(reserveData[3][i]);
            let torqueBorrowInterestRate = new BigNumber(reserveData[4][i]);
            let vaultBalance = new BigNumber(reserveData[5][i]);
            let marketLiquidity = totalAssetSupply.minus(totalAssetBorrow);

            const decimals = token.decimals;
            let usdSupply = new BigNumber(0);
            let usdTotalLocked = new BigNumber(0);

            const precision = new BigNumber(10 ** (18 - decimals));
            totalAssetSupply = totalAssetSupply.times(precision);
            totalAssetBorrow = totalAssetBorrow.times(precision);
            marketLiquidity = marketLiquidity.times(precision);
            //liquidityReserved = liquidityReserved.times(precision);
            vaultBalance = vaultBalance.times(precision);
            if (swapRates[i]) {
                // usdSupply = totalAssetSupply!.times(swapRates[i]).dividedBy(10 ** 18);
                // usdSupplyAll = usdSupplyAll.plus(usdSupply);

                usdTotalLocked = marketLiquidity.plus(vaultBalance).times(swapRates[i]).dividedBy(10 ** 18);
                usdTotalLockedAll = usdTotalLockedAll.plus(usdTotalLocked);
            }

            result.push({
                asset: asset,
                addressErc20: token.erc20Address,
                // symbol,
                // name,
                decimals: decimals,
                // null,// tokenPrice.dividedBy(10 ** 18),
                liquidity: marketLiquidity.dividedBy(10 ** 18).toFixed(),
                // new BigNumber(0),
                totalSupply: totalAssetSupply.dividedBy(10 ** 18).toFixed(),
                totalBorrow: totalAssetBorrow.dividedBy(10 ** 18).toFixed(),
                supplyInterestRate: supplyInterestRate.dividedBy(10 ** 18).toFixed(),
                borrowInterestRate: borrowInterestRate.dividedBy(10 ** 18).toFixed(),
                torqueBorrowInterestRate: torqueBorrowInterestRate.dividedBy(10 ** 18).toFixed(),
                // new BigNumber(0),
                lockedAssets: vaultBalance.dividedBy(10 ** 18).toFixed(),
                swapToUSDPrice: swapRates[i],
                // usdSupply: usdSupply.dividedBy(10 ** 18),
                usdTotalLocked: usdTotalLocked.dividedBy(10 ** 18).toFixed(),

                usdTotalLockedAll: usdTotalLockedAll.dividedBy(10 ** 18).toFixed()
            });
        });

    }

    console.dir(`TVL:`);
    console.dir(result);
}



function getGoodSourceAmountOfAsset(assetName) {
    switch (assetName) {
        case "wbtc":
            return new BigNumber(10 ** 6);
        case "usdc":
            return new BigNumber(10 ** 4);
        default:
            return new BigNumber(10 ** 16);
    }
}

async function getSwapToUsdRateBatch(usdToken) {
    let result = [];

    const oracleAddress = OracleAddress;
    const usdTokenAddress = usdToken.erc20Address;
    const underlyings = iTokens.map(e => (e.erc20Address));
    const amounts = iTokens.map(e => (getGoodSourceAmountOfAsset(e.name).toFixed()));

    result = await DappHeperContract.methods.assetRates(oracleAddress, usdTokenAddress, underlyings, amounts).call();

    return result;
}