import Web3 from 'web3';
import Fulcrum from '../fulcrum'
import { iTokens } from '../fulcrum/config';

import BigNumber from 'bignumber.js';
import { DappHelperJson, mainnetAddress as dappHelperAddress } from '../fulcrum/contracts/DappHelperContract'
import { mainnetAddress as oracleAddress } from '../fulcrum/contracts/OracleContract'


import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });


var web3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/v3/090248ae4e924e70a074376505dcee8c'));
var DappHeperContract = new web3.eth.Contract(DappHelperJson.abi, dappHelperAddress);



export async function getAPR() {
    var reserveData = cache.get("reserve_data");
    if (!reserveData) {
        console.warn("No reserve_data in cache!")
        reserveData = await getReserveData();
    }
    var apr = {};
    reserveData.forEach(item => apr[item.token] = item.supplyInterestRate);

    return apr;
}


export async function getTVL() {
    var reserveData = cache.get("reserve_data");
    if (!reserveData) {
        console.warn("No reserve_data in cache!")
        reserveData = await getReserveData();
    }
    var tvl = {};
    reserveData.forEach(item => tvl[item.token] = item.usdTotalLocked);

    return tvl;
}



async function getReserveData() {
    var result = cache.get("reserve_data");
    if (!result) {

        console.warn("No tvl in cache!")
        result = [];
        var tokenAddresses = iTokens.map(x => (x.address));
        var swapRates = await getSwapToUsdRateBatch(iTokens.find(x => x.name === "dai"));
        var reserveData = await DappHeperContract.methods.reserveDetails(tokenAddresses).call();

        let usdTotalLockedAll = new BigNumber(0);
        let usdSupplyAll = new BigNumber(0);
        if (reserveData && reserveData.totalAssetSupply.length > 0) {
            iTokens.forEach((token, i) => {
                let totalAssetSupply = new BigNumber(reserveData.totalAssetSupply[i]);
                let totalAssetBorrow = new BigNumber(reserveData.totalAssetBorrow[i]);
                let supplyInterestRate = new BigNumber(reserveData.supplyInterestRate[i]);
                let borrowInterestRate = new BigNumber(reserveData.borrowInterestRate[i]);
                let torqueBorrowInterestRate = new BigNumber(reserveData.torqueBorrowInterestRate[i]);
                let vaultBalance = new BigNumber(reserveData.vaultBalance[i]);

                let marketLiquidity = totalAssetSupply.minus(totalAssetBorrow);

                const decimals = token.decimals;
                let usdSupply = new BigNumber(0);
                let usdTotalLocked = new BigNumber(0);

                const precision = new BigNumber(10 ** (18 - decimals));
                totalAssetSupply = totalAssetSupply.times(precision);
                totalAssetBorrow = totalAssetBorrow.times(precision);
                marketLiquidity = marketLiquidity.times(precision);
                vaultBalance = vaultBalance.times(precision);

                if (swapRates[i]) {
                    usdSupply = totalAssetSupply.times(swapRates[i]).dividedBy(10 ** 18);
                    usdSupplyAll = usdSupplyAll.plus(usdSupply);

                    usdTotalLocked = marketLiquidity.plus(vaultBalance).times(swapRates[i]).dividedBy(10 ** 18);
                    usdTotalLockedAll = usdTotalLockedAll.plus(usdTotalLocked);
                }

                result.push({
                    token: token.name,
                    liquidity: marketLiquidity.dividedBy(10 ** 18).toFixed(),
                    totalSupply: totalAssetSupply.dividedBy(10 ** 18).toFixed(),
                    totalBorrow: totalAssetBorrow.dividedBy(10 ** 18).toFixed(),
                    supplyInterestRate: supplyInterestRate.dividedBy(10 ** 18).toFixed(),
                    borrowInterestRate: borrowInterestRate.dividedBy(10 ** 18).toFixed(),
                    torqueBorrowInterestRate: torqueBorrowInterestRate.dividedBy(10 ** 18).toFixed(),
                    swapRates: swapRates[i],
                    lockedAssets: vaultBalance.dividedBy(10 ** 18).toFixed(),
                    swapToUSDPrice: swapRates[i],
                    usdSupply: usdSupply.dividedBy(10 ** 18).toFixed(),
                    usdTotalLocked: usdTotalLocked.dividedBy(10 ** 18).toFixed(),
                });
            });
            result.push({
                token: "all",
                usdSupply: usdSupplyAll.dividedBy(10 ** 18),
                usdTotalLocked: usdTotalLockedAll.dividedBy(10 ** 18).toFixed()
            })

        }
        cache.set("reserve_data", result);
        console.dir(`reserve_data:`);
        console.dir(result);
    }
    return result;
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
    const usdTokenAddress = usdToken.erc20Address;
    const underlyings = iTokens.map(e => (e.erc20Address));
    const amounts = iTokens.map(e => (getGoodSourceAmountOfAsset(e.name).toFixed()));

    result = await DappHeperContract.methods.assetRates(oracleAddress, usdTokenAddress, underlyings, amounts).call();

    return result;
}