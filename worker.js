const {parentPort,workerData} = require('worker_threads');
const{number, fibonacciHelper} = workerData;
let fibonacci = fibonacciHelper;
while(fibonacci.length<number){
        fibonacci.push(parseInt(fibonacci.slice(fibonacci.length-2,fibonacci.length-1)) + parseInt(fibonacci.slice(fibonacci.length-1,fibonacci.length)))
}   
console.log("Fibonacci from worker",fibonacci);
parentPort.postMessage(fibonacci);

