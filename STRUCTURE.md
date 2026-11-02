top-operator/
├── prisma/
│   └── schema.prisma                          # Prisma schema lengkap
│
├── shared/
│   └── types/
│       └── index.ts                           # TypeScript types (dipakai di semua apps)
│
├── apps/
│   ├── backoffice/                            # Next.js 14 App Router
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   └── src/
│   │       ├── app/
│   │       │   ├── api/
│   │       │   │   ├── reports/
│   │       │   │   │   ├── ao/daily/route.ts           # GET Rekap AO Harian
│   │       │   │   │   └── collection/daily/route.ts   # GET Rekap Collection Harian
│   │       │   │   ├── debitur/
│   │       │   │   │   ├── [accountNumber]/
│   │       │   │   │   │   └── controller/route.ts     # GET Data 360° Debitur
│   │       │   │   │   └── controller/action/route.ts  # POST Aksi Controller
│   │       │   │   └── mobile/
│   │       │   │       └── visit/route.ts              # POST Submit Kunjungan Mobile
│   │       │   └── dashboard/
│   │       │       └── debitur/
│   │       │           └── [accountNumber]/
│   │       │               └── page.tsx                # UI Debitur Card Controller
│   │       ├── components/
│   │       │   └── debitur/
│   │       │       ├── VisitTimelineItem.tsx           # Timeline kunjungan
│   │       │       └── PTPTable.tsx                   # Tabel PTP (TanStack Table)
│   │       └── lib/
│   │           ├── prisma.ts                          # Prisma client singleton
│   │           ├── helpers.ts                         # generateSPNumber, getDpdBucket
│   │           ├── formatters.ts                      # formatRupiah, formatDate, dll
│   │           └── storage.ts                         # uploadPhotoToStorage (S3/R2)
│   │
│   └── mobile/                                # React Native (Expo)
│       ├── app.json
│       ├── package.json
│       └── src/
│           ├── screens/
│           │   ├── DebiturVisitScreen.tsx             # Form kunjungan lapangan
│           │   └── CollectionDTHScreen.tsx            # Daftar tagihan kolektor
│           ├── services/
│           │   ├── visitService.ts                    # API submit kunjungan
│           │   └── collectionService.ts               # API ambil DTH
│           └── config/
│               └── index.ts                           # API_BASE_URL, dll
│
└── packages/
    └── jobs/
        └── src/
            └── ptpEvaluator.ts                        # Background jobs:
                                                       #  - evaluatePTPDaily()
                                                       #  - processAutodebitTitipan()
                                                       #  - batchProcessAutodebit()
                                                       #  - updateDPDHarian()
