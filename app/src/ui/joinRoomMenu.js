

const joinBnt = document.getElementById('joinJoin');
const joinBaseText=joinBnt.innerHTML;
let joining = false;
document.getElementById('joinCode').addEventListener("input",(e)=>{
    const value = e.target.value;
    joinBnt.disabled = value.length===0;
});


joinBnt.onclick=(e)=>{
    if(joining)return;
    joining=true;
    // ... try to join room
    joinBnt.innerHTML='Joining ...';
    setTimeout(()=>{
        joining=false;
        joinBnt.innerHTML=joinBaseText;
    },1000)
}