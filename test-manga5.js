fetch('https://api.allanime.day/api', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: '{ __type(name: "Query") { fields { name args { name type { name kind ofType { name kind } } } } } }' })
}).then(r=>r.json()).then(data=>{
  const cp = data.data.__type.fields.find(f=>f.name==='chapterPages');
  console.log(JSON.stringify(cp.args, null, 2));
}).catch(console.error);
