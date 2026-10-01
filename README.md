# Aile Bütçesi

Eşlerin tek bir aile alanında gelir, gider, hesap, bütçe hedefi, varlık ve yatırım takibi yapabilmesi için geliştirilen açık kaynak mobil uygulama.

> Durum: Adım 3 tamamlandı. Expo temeli, kimlik doğrulama, aile ve eş daveti yanında tip güvenli gelir/gider kayıt akışı hazırdır.

## Özellik vizyonu

- İki cihaz arasında hızlı ve güvenli aile bütçesi senkronizasyonu
- Gelir, gider ve hesaplar arası transfer kaydı
- Harcamayı yapan aile üyesini seçebilme
- Kategori bazlı aylık bütçe ve tasarruf hedefleri
- Döviz, altın, hisse ve fon portföyü takibi
- Nakit akışı, harcama dağılımı ve net varlık raporları

## Teknoloji yığını

| Katman | Teknoloji |
| --- | --- |
| Mobil | React Native 0.86 ve Expo SDK 57 |
| Dil | TypeScript strict mode |
| Navigasyon | Expo Router |
| Backend | Supabase Auth, PostgreSQL ve Realtime |
| Yetkilendirme | PostgreSQL Row Level Security |
| İstemci state | Zustand |
| Oturum saklama | Expo SQLite localStorage |
| Güvenli istek UUID'si | Expo Crypto |
| Doğrulama | Zod |
| Kod kalitesi | ESLint ve TypeScript |

## Mimari

Proje feature-first Clean Architecture kullanır. Route dosyaları yalnızca ekran ve navigasyon bileşimi yapar; domain kuralları Expo veya Supabase'e bağımlı değildir.

```text
src/
├── app/                  Expo Router ekranları
├── core/                 Ortam, Supabase ve ortak tipler
├── features/             Auth, household ve transaction modülleri
├── shared/               Tema ve yeniden kullanılabilir UI
└── store/                Küçük global istemci durumu

supabase/
├── migrations/           Versiyonlanmış PostgreSQL şeması ve RLS
└── tests/                pgTAP güvenlik yapısı testleri
```

Ayrıntı için [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) dosyasına bakın.

## Güvenlik modeli

- Tüm finansal tablolar RLS ile korunur.
- Bir kullanıcı yalnızca aktif üyesi olduğu `household_id` satırlarını görebilir.
- Üyelik kontrolü, RLS recursion riskini önlemek için kilitli `private` şema içindeki `security definer` yardımcılarıyla yapılır.
- `anon` rolünün özel finans tablolarında yetkisi yoktur.
- Mobil uygulamada yalnızca Supabase publishable key kullanılır; secret/service role key hiçbir zaman istemciye konmaz.
- Davet kodunun yalnızca SHA-256 özeti saklanır; ham kod sadece oluşturulduğu anda sahibine döner.
- Davet kabulü satır kilidi kullanan atomik bir PostgreSQL fonksiyonudur; aynı kod iki kez kullanılamaz.
- Bir kullanıcı aynı anda yalnızca bir aktif aile hesabına üye olabilir.
- İşlemdeki `added_by` alanı istemci girdisinden değil doğrulanmış oturumdan alınır.
- Her kayıt isteği UUID ile idempotenttir; aynı isteğin tekrar gönderilmesi ikinci işlem oluşturmaz.
- Tutarlar JavaScript kayan noktalı sayısına çevrilmeden decimal string olarak taşınır.

## Kurulum

### Gereksinimler

- Node.js 22.13 veya üzeri
- npm
- iOS Simulator, Android Emulator veya fiziksel cihaz
- Bir Supabase projesi

### Uygulamayı hazırlama

```bash
git clone https://github.com/KULLANICI_ADI/family-budget-app.git
cd family-budget-app
npm install
cp .env.example .env
```

`.env` içindeki değerleri Supabase Dashboard içindeki Connect ekranından alın:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_me
```

`EXPO_PUBLIC_` değişkenleri uygulama paketinde görülebilir. Bu nedenle buraya hiçbir zaman database password, `sb_secret` veya eski `service_role` anahtarı koymayın. Veri güvenliği publishable key'in gizli olmasına değil RLS politikalarına dayanır.

### Veritabanını hazırlama

Supabase CLI ile bağlantılı proje kullanıyorsanız:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Alternatif olarak `supabase/migrations/202610010001_initial_schema.sql` dosyasını Supabase SQL Editor üzerinden çalıştırabilirsiniz.
SQL Editor kullanıyorsanız `supabase/migrations/` altındaki dosyaları dosya adı sırasıyla çalıştırın.

Supabase Dashboard içindeki **Authentication > Providers > Email** bölümünden e-posta sağlayıcısını etkinleştirin. Geliştirme sırasında e-posta doğrulamasını açık tutuyorsanız kullanıcı, gelen bağlantıyı doğruladıktan sonra uygulamaya dönüp giriş yapabilir.

### Uygulamayı çalıştırma

```bash
npm run start
```

Ardından terminalde `i` ile iOS, `a` ile Android ya da QR kod ile fiziksel cihazı açın.

## Kalite kontrolleri

```bash
npm run lint
npm run typecheck
npm run doctor
npm run check
```

Yerel Supabase ortamı kurulduktan sonra veritabanı testleri:

```bash
npx supabase test db
```

## Ortam değişkenleri

| Değişken | İstemcide görünür | Açıklama |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Evet | Supabase proje URL'si |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Evet | RLS ile sınırlandırılmış istemci anahtarı |

Sunucu sırları ileride Supabase Edge Function secret store veya CI secret store içinde tutulacaktır; repoya ve mobil pakete eklenmeyecektir.

## Ekran görüntüleri

| Özet | İşlem ekleme | Bütçe | Varlıklar |
| --- | --- | --- | --- |
| _Yakında_ | _Yakında_ | _Yakında_ | _Yakında_ |

Görseller hazır olduğunda `screenshots/` klasörüne eklenebilir.

## Yol haritası

- [x] Expo ve TypeScript proje temeli
- [x] Clean Architecture klasörleri
- [x] Supabase şeması ve household RLS
- [x] Güvenli ortam değişkeni örneği
- [x] Auth ve aile oluşturma
- [x] Eş davet kodu ve atomik kabul akışı
- [x] Gelir ve gider ekleme
- [ ] Bütçe ve hedefler
- [ ] Varlık ve yatırım takibi
- [ ] Raporlama ve grafikler

## Katkıda bulunma

1. Depoyu fork edin.
2. `feat/kisa-aciklama` biçiminde bir branch oluşturun.
3. Küçük, test edilebilir commit'ler hazırlayın.
4. `npm run check` ve ilgili veritabanı testlerini çalıştırın.
5. Değişikliğin amacı, ekran görüntüsü ve test notlarıyla pull request açın.

Güvenlik açığını herkese açık issue olarak paylaşmayın. Özel bildirim süreci proje yayınlanırken `SECURITY.md` içinde tanımlanacaktır.

## Lisans

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.
