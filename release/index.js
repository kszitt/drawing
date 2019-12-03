var initConfig = {
  tool: [""]
};

function Draw(id){
  if(!window.d3){
    throw new Error("请引入d3.js，CDN请参考“https://cdnjs.com/libraries/d3”");
  }
  this.box = d3.select(id);
  if(!this.box.node()){
    throw new Error("请实例化“draw”时，传入"+ (id ? "正确的" : "") +"容器“selector”");
  }
}

Draw.prototype = {
  create: function(){
    this.box.append("svg")
      .style("width", "100%")
      .style("height", "100%")
  }
};

window.Draw = Draw;
