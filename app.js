const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const redis = require('redis');
const { promisifyAll, promisify } = require('bluebird');
promisifyAll(redis);
const client = redis.createClient({
    legacyMode: true,
    PORT: 6379
  })
client.connect().catch(console.error)
const app =express();

app.use(helmet());
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*")
    next()
});
app.use(bodyParser.urlencoded({extended:true}));
app.redis = require('redis').createClient()

app.post("/fibonacci", async (req, res) => {
    let fibonacci = [];
    let number = parseInt(req.body.number);
    fibonacci = (number==0)?(fibonacci = []):((number==1)?(fibonacci = [0]):(fibonacci = [0,1]));
    if(number>=2){
    let redisKey = String(number);
    const getAsync = promisify(client.get).bind(client);
    const setAsync = promisify(client.set).bind(client);
    const cachedfibonacci =  await getAsync(redisKey);
    if(cachedfibonacci)
    {
        fibonacci  = JSON.parse(cachedfibonacci);
    }else{
    let closestComputedNumb = redisKey-1;
    let closestFibonacci;
    while(!closestFibonacci && closestComputedNumb>0)
    {
       closestFibonacci = await getAsync(closestComputedNumb);
       closestComputedNumb--;
    }
    let fibonacciHelper = [0,1];
    if(closestFibonacci)
    {
        fibonacciHelper = JSON.parse(closestFibonacci);
    }
    fibonacci = computeFibonacciSeries(number,fibonacciHelper); 
    let stringifyFibonacci = JSON.stringify(fibonacci);
    await setAsync(redisKey,stringifyFibonacci);
    }
    }
    res.status(200).send(fibonacci);
});

function computeFibonacciSeries(number,fibonacciHelper)
{
    let fibonacci = fibonacciHelper;
    while(fibonacci.length<number){
        fibonacci.push(parseInt(fibonacci.slice(fibonacci.length-2,fibonacci.length-1)) + parseInt(fibonacci.slice(fibonacci.length-1,fibonacci.length)))
    }   
    return fibonacci;
}

app.use(function(req, res){
    res.status(400).send("URL does not exist!");
});

module.exports = app; 