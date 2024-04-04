const express = require('express');
const axios = require('axios');
const fs = require('fs');
const { configure, getLogger } = require('log4js');
const app = express();

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Read the configurations from the JSON file
const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));
const port = config.port
const logLevel = config.logger
const refreshRate = config.refresh
const services = config.services

// Configure log4js
configure({
  appenders: {
    console: { type: 'console' },
    file: { type: 'file', filename: 'logs/app.log' }
  },
  categories: {
    default: { appenders: ['console', 'file'], level: logLevel }
  }
});

const logger = getLogger('app.js');

// Calculate the total number of services
const totalServices = services.length;
logger.info(`Found ${totalServices} services in config json`);

// Define a route to handle the homepage
app.get('/', async (req, res) => {
  const statusPromises = services.map(async service => {
    // Make a GET request to each endpoint and check the status
    const name = service.service
    const endpoint = service.endpoint
    try {
      const response = await axios.get(endpoint);
      logger.debug(`Returned ${response.status} from ${endpoint}`)
      return { name, endpoint, status: response.status };
    } catch (error) {
      logger.error(`Error fetching data from ${endpoint}:`, error.stack);
      if (error.code === 'ENOTFOUND') {
        var statusCode = 500
      } else {
        var statusCode = error.code
      }
      return { name, endpoint, status: statusCode }; // Return an error status
    }
  });

  // Wait for all status checks to complete
  const statuses = await Promise.all(statusPromises);

  // Render the 'index' template and pass the statuses data to it
  res.render('index', { statuses, refreshRate, totalServices });
});

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Start the server
app.listen(port, () => {
  logger.info(`Server is running on port ${port}`)
});