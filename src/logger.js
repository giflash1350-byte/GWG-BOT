const levels={error:0,warn:1,info:2,debug:3};const threshold=levels[process.env.LOG_LEVEL]??2;
export const logger=Object.freeze(Object.fromEntries(Object.entries(levels).map(([level])=>[level,(message,metadata)=>{if(levels[level]<=threshold)console[level==='error'?'error':'log'](JSON.stringify({time:new Date().toISOString(),level,message,...(metadata?{metadata}:{})}));}])));
