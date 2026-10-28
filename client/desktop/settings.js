const input=document.querySelector('#serverUrl'),error=document.querySelector('#settingsError'),button=document.querySelector('#saveSettings');
window.magicSettings.get().then(settings=>{input.value=settings.serverUrl;input.focus();}).catch(e=>{error.textContent=e.message;});
document.querySelector('#cancelSettings').onclick=()=>window.magicSettings.close();
document.querySelector('#settingsForm').onsubmit=async event=>{
 event.preventDefault();button.disabled=true;error.textContent='';
 try{const result=await window.magicSettings.save(input.value.trim());if(result.ok)window.magicSettings.close();else error.textContent=result.error;}catch(e){error.textContent=e.message;}finally{button.disabled=false;}
};
