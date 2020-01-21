import { Router } from 'express';
import facets from './facets';
import { getInfo, getAPR } from '../web3/index';

export default ({ config, db }) => {
	let api = Router();

	// mount the facets resource
	api.use('/facets', facets({ config, db }));

	// perhaps expose some API metadata at the root
	api.get('/apr', async (req, res) => {
		var apr = await getAPR();
		res.json({ apr: apr });
	});

	api.get('/', (req, res) => {
		res.json({ someres: "test" });
	});

	return api;
}
