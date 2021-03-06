import { iTokens } from '../config/iTokens';

import BigNumber from 'bignumber.js';
import { iTokenJson } from './contracts/iTokenContract';



export default class Torque {
    constructor(web3, cache) {
        this.web3 = web3;
        this.cache = cache

     }

    async getBorrowDepositEstimate(borrowAssetName, collateralAssetName, amount) {
        const result = { depositAmount: new BigNumber(0), gasEstimate: new BigNumber(0) };
        const borrowAsset = iTokens.find(token => token.name === borrowAssetName)
        const collateralAsset = iTokens.find(token => token.name === collateralAssetName)

        const iTokenContract = new this.web3.eth.Contract(iTokenJson.abi, borrowAsset.address);
        const collateralAssetErc20Address = collateralAsset.erc20Address;
        if (iTokenContract && collateralAssetErc20Address) {
            const loanPrecision = borrowAsset.decimals || 18;
            const collateralPrecision = collateralAsset.decimals || 18;
            const borrowEstimate = await iTokenContract.methods.getDepositAmountForBorrow(
                new BigNumber(amount).multipliedBy(10 ** loanPrecision),
                new BigNumber(2 * 10 ** 18),
                new BigNumber(7884000), // approximately 3 months
                collateralAssetErc20Address).call();
            result.depositAmount = new BigNumber(borrowEstimate)
                // .multipliedBy(150 + marginPremium)
                // .dividedBy(125 + marginPremium)
                .dividedBy(10 ** collateralPrecision);
            result.depositAmount = result.depositAmount.multipliedBy(1.005).dp(5, BigNumber.ROUND_CEIL);
            /*result.gasEstimate = await this.web3Wrapper.estimateGasAsync({
              ...
            }));*/
        }

        return result;
    }


}

