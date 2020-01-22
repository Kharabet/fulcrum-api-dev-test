import { iTokenJson } from './contracts/iTokenContract'
export default class Fulcrum {
    constructor(token, web3) {
        this.token = token;
        this.tokenContract = new web3.eth.Contract(iTokenJson.abi, token.address);
        
    }

    async getAPR() {
        var supply_rate = await this.tokenContract.methods.supplyInterestRate().call();
        var apr = supply_rate / 10 ** 18;
        console.log(`${this.token.name} apr: ${apr}`)
        return apr;
    }

}