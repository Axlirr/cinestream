const q = `query($mangaId: String!, $chapterString: String!, $translationType: VaildTranslationTypeMangaEnumType!){ chapterPages(mangaId: $mangaId, chapterString: $chapterString, translationType: $translationType) { edges { pictureUrls } } }`;
fetch('https://api.allanime.day/api', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Referer': 'https://allmanga.to/' },
  body: JSON.stringify({
    variables: { mangaId: 'ReooPAx25DvtDsqkG', chapterString: '700', translationType: 'sub' },
    query: q
  })
}).then(r => r.json()).then(data => console.log(JSON.stringify(data, null, 2))).catch(console.error);
