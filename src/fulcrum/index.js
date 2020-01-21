import { tokenAddresses, iToken } from './config'

export default class Fulcrum {
    constructor(token, web3) {
        this.token = token;
        this.contract = new web3.eth.Contract(iToken.abi, tokenAddresses[`i${token}`]);
    }


    async getAPR() {
        var supply_rate = await this.contract.methods.supplyInterestRate().call();
        var apr = supply_rate / 10 ** 18;
        console.log(`${this.token} apr: ${apr}`)
        return apr;
    }
}