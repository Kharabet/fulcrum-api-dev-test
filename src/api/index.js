import { Router } from 'express';
import { getTVL, getAPR } from '../web3/index';

export default ({ config}) => {
	let api = Router();

	api.get('/apr', async (req, res) => {
		var apr = await getAPR();
		res.json(apr);
	});
	
	api.get('/tvl-usd', async (req, res) => {
		var tvl = await getTVL();
		res.json(tvl);
	});

	return api;
}
