# Angielski • Racibo

Statyczna aplikacja do nauki angielskiego: notatnik lekcji, fiszki (polski → angielski) i sesje audio z syntezą mowy przeglądarki.

## Uruchomienie lokalnie
Otwórz `index.html` w przeglądarce. Aplikacja nie wymaga instalacji zależności ani procesu build.

## Publikacja w Netlify
- Importuj to repozytorium z GitHub.
- Build command: pozostaw pusty.
- Publish directory: `.` (katalog główny repozytorium).
- Opcjonalnie dodaj własną domenę w ustawieniach Netlify i skonfiguruj DNS według instrukcji Netlify.

## Funkcje
- lekcje z datą i własnym tytułem;
- polskie podpowiedzi i angielskie słowa/zwroty/zdania;
- oznaczanie wpisów jako fiszki i filtrowanie według lekcji, rodzaju oraz długości;
- odsłanianie odpowiedzi i odczyt głosowy;
- układanie audio-powtórki z pauzami i wielokrotnymi powtórzeniami;
- zapis danych lokalnie w przeglądarce oraz eksport kopii JSON;
- podstawowy cache PWA.

## Ważne ograniczenia
Dane są przechowywane lokalnie w przeglądarce na danym urządzeniu. Użyj „Eksport danych”, aby zachować kopię. Audio jest generowane na żywo przez syntezę mowy przeglądarki — aplikacja nie tworzy plików MP3, a odtwarzanie przy zablokowanym ekranie może być ograniczone.

## Struktura
Pliki aplikacji (`index.html`, `style.css`, `app.js`, `manifest.webmanifest`, `sw.js`) znajdują się w katalogu głównym, aby Netlify mógł publikować repozytorium bez dodatkowej konfiguracji.
