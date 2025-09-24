import { Plugin } from 'vite';
import chalk from 'chalk';

export function consoleLoggerPlugin(): Plugin {
  return {
    name: 'console-logger',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method === 'POST' && req.url === '/__console') {
          let body = '';
          
          req.on('data', chunk => {
            body += chunk.toString();
          });
          
          req.on('end', () => {
            try {
              const { level, message, timestamp, url } = JSON.parse(body);
              const time = new Date(timestamp).toLocaleTimeString();
              
              // Format the console output with colors
              const prefix = `[${time}] [CLIENT]`;
              
              switch (level) {
                case 'error':
                  console.log(chalk.red(`${prefix} ERROR:`), message);
                  break;
                case 'warn':
                  console.log(chalk.yellow(`${prefix} WARN:`), message);
                  break;
                case 'info':
                  console.log(chalk.blue(`${prefix} INFO:`), message);
                  break;
                case 'debug':
                  console.log(chalk.gray(`${prefix} DEBUG:`), message);
                  break;
                default:
                  console.log(chalk.white(`${prefix} LOG:`), message);
              }
              
              res.statusCode = 204;
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.end();
            } catch (e) {
              console.error('Error parsing console log:', e);
              res.statusCode = 400;
              res.end();
            }
          });
        } else if (req.method === 'OPTIONS' && req.url === '/__console') {
          // Handle preflight requests
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.end();
        } else {
          next();
        }
      });
    },
  };
}