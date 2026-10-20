# Angielski • Racibo

Darmowy, statyczny notatnik do nauki angielskiego: lekcje, oznaczane fiszki, ćwiczenia polski → angielski i audio-powtórki do słuchania w drodze.

## Uruchomienie
Otwórz `index.html` w przeglądarce albo opublikuj katalog na Netlify (Deploy manually / przeciągnij folder lub ZIP). Aplikacja nie wymaga builda ani kluczy API.

## Funkcje MVP
- lekcje z datą i własnym tytułem;
- wpisy polskie i angielskie, typ: słówko / zwrot / zdanie;
- przełącznik dodania do fiszek;
- filtry fiszek: lekcja, typ, długość; domyślny kierunek polski → angielski;
- synteza mowy przeglądarki dla polskich podpowiedzi i angielskich odpowiedzi;
- generowanie sesji audio z wielokrotnymi powtórkami i pauzą na przypomnienie;
- lokalny zapis w przeglądarce i eksport kopii JSON;
- podstawowe PWA/offline cache.

## Ograniczenia MVP
Dane pozostają w pamięci przeglądarki na danym urządzeniu; eksportuj kopię. Audio jest odtwarzane na żywo przez systemową syntezę mowy, nie eksportowane do MP3. Przeglądarka/Android mogą ograniczać mowę przy zablokowanym ekranie lub oszczędzaniu baterii. Fonty Google są opcjonalne; interfejs ma fallback systemowy.

## Publikacja pod angielski.racibo.pl
1. Utwórz repozytorium GitHub `racibo/angielski.racibo.pl` (publiczne lub prywatne według uznania).
2. Wgraj zawartość katalogu projektu do głównego katalogu repo.
3. W Netlify: Add new site → Import from Git → wybierz repo; build command pozostaw pusty, publish directory ustaw na `.`.
4. W Netlify Domain management dodaj `angielski.racibo.pl` i skonfiguruj rekord DNS zgodnie z instrukcją Netlify.

## Następne kroki
- edycja istniejących fiszek i możliwość importu JSON;
- plan powtórek spaced repetition;
- tryb audio z automatycznym zapisem MP3 (wymaga osobnej, dobranej usługi lub lokalnego generatora);
- lepsza obsługa odtwarzania w tle na Androidzie.
