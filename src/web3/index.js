import Web3 from 'web3';
import Fulcrum from '../fulcrum'
import { tokens } from '../fulcrum/config'

var web3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/v3/090248ae4e924e70a074376505dcee8c'));


export async function getAPR() {
    var resultPromises = tokens.map(async token => {
        var market = new Fulcrum(token, web3);
        var apr = await market.getAPR();
        return {[token]: apr};
    });

    return await Promise.all(resultPromises);
}


