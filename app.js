const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const redis = require('redis');
const { promisifyAll, promisify } = require('bluebird');
const {Worker, workerData}=require('worker_threads');
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
    if(number<0)
    {
        res.status(200).send("Number should be greater than equal to 0");
    }
    else if(number<2)
    {
        res.status(200).send(fibonacci);
    }
    else{
        let redisKey = String(number);
        const getAsync = promisify(client.get).bind(client);
        const setAsync = promisify(client.setEx).bind(client);
        const cachedfibonacci =  await getAsync(redisKey);
       if(cachedfibonacci)
        {
            console.log("Reading from Cache");
            fibonacci  = JSON.parse(cachedfibonacci);
            res.status(200).send(fibonacci);
        }else{
            let closestComputedNumb = redisKey-1;
            let closestFibonacci;
            while(!closestFibonacci && closestComputedNumb>0)
            {
                closestFibonacci = await getAsync(closestComputedNumb);
                closestComputedNumb--;
            }
            console.log("Closest Smaller number from which we generate fibonacci:",closestComputedNumb+1);
            let fibonacciHelper = [0,1];
            if(closestFibonacci)
            {
                fibonacciHelper = JSON.parse(closestFibonacci);
            }
            let worker = new Worker('./worker.js',{workerData:{number:number,fibonacciHelper:fibonacciHelper}});
            worker.on('message', async (data)=>{
               fibonacci = data;
               console.log("using value from worker in app.js",fibonacci);
               let stringifyFibonacci = JSON.stringify(fibonacci);
               await setAsync(redisKey,3600,stringifyFibonacci);
                res.status(200).send(fibonacci);
            })
        }
    }
});

function computeFibonacciSeries(number,fibonacciHelper)
{
    console.log("Fibonacci Helper",fibonacciHelper);
    let fibonacci = fibonacciHelper;
    while(fibonacci.length<number){
        fibonacci.push(parseInt(fibonacci.slice(fibonacci.length-2,fibonacci.length-1)) + parseInt(fibonacci.slice(fibonacci.length-1,fibonacci.length)))
    }   
    return fibonacci;
}

app.get("/fibonacciFirst20", (req, res) => {
    let fibonacci = [0,1];

    while(fibonacci.length<20){
      fibonacci.push(parseInt(fibonacci.slice(fibonacci.length-2,fibonacci.length-1)) + parseInt(fibonacci.slice(fibonacci.length-1,fibonacci.length)))
    }

    res.status(200).send(fibonacci);
});


app.use(function(req, res){
    res.status(400).send("URL does not exist!");
});

module.exports = app; 