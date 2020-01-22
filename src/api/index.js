import { Router } from 'express';
import Fulcrum from "../fulcrum";
import NodeCache from "node-cache";
import Web3 from 'web3';


export default ({ config}) => {

	let api = Router();
	const cache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });
	var web3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/v3/090248ae4e924e70a074376505dcee8c'));


	var fulcrum = new Fulcrum(web3,cache);
	api.get('/apr', async (req, res) => {
		var apr = await fulcrum.getAPR();
		res.json(apr);
	});
	
	api.get('/tvl-usd', async (req, res) => {
		var tvl = await fulcrum.getTVL();
		res.json(tvl);
	});

	return api;
}
