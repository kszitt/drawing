export function getStyle(obj,attr){
  if(!obj) return 0;

  let value;
  if(obj.currentStyle){
    value = obj.currentStyle[attr];
  } else{
    value = document.defaultView.getComputedStyle(obj,null)[attr];
  }

  if(/^\d+/.test(value)) value = parseInt(value);

  return value;
}
