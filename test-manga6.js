fetch('https://api.allanime.day/api', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: '{ __type(name: "VaildTranslationTypeMangaEnumType") { enumValues { name } } }' })
}).then(r=>r.json()).then(data=>{
  console.log(JSON.stringify(data.data.__type.enumValues.map(e=>e.name), null, 2));
}).catch(console.error);
