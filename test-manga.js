const q = `query($search: SearchInput, $limit: Int){ mangas(search: $search, limit: $limit) { edges { _id name englishName availableChaptersDetail } } }`;
fetch('https://api.allanime.day/api', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    variables: { search: { query: 'Naruto', allowAdult: false, allowUnknown: false }, limit: 5 },
    query: q
  })
}).then(r => r.json()).then(data => console.log(JSON.stringify(data, null, 2))).catch(console.error);
