const fs=require('fs');
const src=fs.readFileSync('data/etopo2022_1deg.csv','utf8').trim().split(/\r?\n/).slice(2);
const values=new Int16Array(src.length);
for(let i=0;i<src.length;i++)values[i]=Math.round(Number(src[i].split(',')[2]));
const base64=Buffer.from(values.buffer).toString('base64');
fs.writeFileSync('etopo-data.js',`const ETOPO={rows:180,cols:360,lat0:-89.9916666667,lon0:0.0083333333,step:1,values:"${base64}"};\n`);
console.log(`wrote ${values.length} elevations`);
