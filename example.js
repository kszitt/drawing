const express = require("express");
const app = express();


app.use(express.static(__dirname));


app.listen("3000", function(err){
  if(err) console.eror(err);

  console.log("服务开启：http://localhost:3000");
});

