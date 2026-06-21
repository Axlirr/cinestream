const q = `query($showId: String!, $chapterString: String!, $translationType: VaildTranslationTypeEnumType!){ chapterPages(showId: $showId, chapterString: $chapterString, translationType: $translationType) { edges { pictureUrl } } }`;
fetch('https://api.allanime.day/api', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    variables: { showId: 'ReooPAx25DvtDsqkG', chapterString: '700', translationType: 'sub' },
    query: q
  })
}).then(r => r.json()).then(data => console.log(JSON.stringify(data, null, 2))).catch(console.error);
