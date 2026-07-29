# Diet — Flutter

Pendamping diet pintar yang dimulai dari pertanyaan sederhana: “Apakah kamu
lapar?”

Versi Flutter dibangun berdampingan dengan aplikasi Expo selama masa migrasi.
Build debug memakai ID `com.dendyelo.diet.flutterdev`, sehingga dapat dipasang
tanpa menimpa aplikasi lama. Build release mempertahankan ID produksi
`com.dendyelo.diet` untuk cutover setelah pemeriksaan data selesai.

## Yang sudah tersedia

- Hunger Check sebagai layar pembuka, lengkap dengan jeda makan otomatis.
- Keseimbangan energi masuk, energi keluar berjalan, dan batas diet tetap.
- BMR Mifflin–St Jeor dan TDEE berdasarkan gerak rutin di luar olahraga serta
  respons tubuh.
- Langkah iPhone melalui Core Motion dan aktivitas yang diceritakan kepada AI.
- Jurnal asupan, edit waktu HH:MM hari ini, protein, air, dan riwayat berat.
- AI untuk analisis makanan, aktivitas, coach, dan insight setelah check-in.
- Google AI Studio dengan 11 model berurutan serta provider OpenAI-compatible.
- API key disimpan di Keychain/secure storage, tidak di source code.

## Aturan energi

- Batas diet = TDEE profil − defisit yang aman.
- BMR/TDEE keluar sedikit demi sedikit mengikuti waktu, bukan penuh sejak pagi.
- Langkah dan olahraga menambah energi keluar, tetapi tidak menaikkan batas diet.
- AI hanya menjelaskan konteks; keputusan makan tetap dikunci oleh aturan lokal.
- Hasil check-in berhenti berlaku setelah makan dicatat atau setelah 30 menit.
- Jeda makan dihitung dari waktu asupan terakhir dan bukan target puasa.

## Menjalankan

```sh
flutter pub get
flutter run
```

## Pemeriksaan

```sh
flutter analyze
flutter test
flutter build ios --simulator
flutter build ios --debug
```

Master ikon aplikasi berada di `assets/branding/app_icon_master.png`.
