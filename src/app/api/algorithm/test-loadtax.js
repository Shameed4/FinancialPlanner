// testLoadTaxData.js
import { loadRMD, loadTaxData } from './Simulation.js';

loadRMD()
    .then(result => {
        console.log('Loaded RMD Data:', result);
    })
    .catch(error => {
        console.error('Error loading tax data:', error);
    });

loadTaxData()
    .then(result => {
        console.log('\n\nLoaded Tax Data:', result);
    })
    .catch(error => {
        console.error('Error loading tax data:', error);
    });
