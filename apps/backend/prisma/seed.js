"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding GloryCast database...');
    // ── Create demo church ───────────────────────────────────────────────────
    const church = await prisma.church.upsert({
        where: { slug: 'grace-community-church' },
        update: {},
        create: {
            name: 'Grace Community Church',
            slug: 'grace-community-church',
            description: 'A spirit-filled church community',
            timezone: 'America/New_York',
            country: 'US',
            subscriptionTier: 'PROFESSIONAL',
            settings: {
                defaultBibleTranslation: 'NIV',
                streamingEnabled: true,
                aiEnabled: true,
            },
        },
    });
    // ── Create super admin ───────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash('Admin@123', 12);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@glorycast.ai' },
        update: {},
        create: {
            email: 'admin@glorycast.ai',
            passwordHash,
            firstName: 'GloryCast',
            lastName: 'Admin',
            emailVerified: true,
        },
    });
    await prisma.churchMember.upsert({
        where: { userId_churchId: { userId: admin.id, churchId: church.id } },
        update: {},
        create: {
            userId: admin.id,
            churchId: church.id,
            role: client_1.Role.CHURCH_ADMIN,
            isDefault: true,
        },
    });
    // ── Create demo producer user ────────────────────────────────────────────
    const producerHash = await bcrypt.hash('Producer@123', 12);
    const producer = await prisma.user.upsert({
        where: { email: 'producer@glorycast.ai' },
        update: {},
        create: {
            email: 'producer@glorycast.ai',
            passwordHash: producerHash,
            firstName: 'Demo',
            lastName: 'Producer',
            emailVerified: true,
        },
    });
    await prisma.churchMember.upsert({
        where: { userId_churchId: { userId: producer.id, churchId: church.id } },
        update: {},
        create: {
            userId: producer.id,
            churchId: church.id,
            role: client_1.Role.PRODUCER,
            isDefault: true,
        },
    });
    // ── Bible books ──────────────────────────────────────────────────────────
    const bibleBooks = [
        { id: 1, name: 'Genesis', abbreviation: 'Gen', testament: 'OT', chapters: 50, order: 1 },
        { id: 2, name: 'Exodus', abbreviation: 'Exo', testament: 'OT', chapters: 40, order: 2 },
        { id: 19, name: 'Psalms', abbreviation: 'Ps', testament: 'OT', chapters: 150, order: 19 },
        { id: 20, name: 'Proverbs', abbreviation: 'Prov', testament: 'OT', chapters: 31, order: 20 },
        { id: 23, name: 'Isaiah', abbreviation: 'Isa', testament: 'OT', chapters: 66, order: 23 },
        { id: 40, name: 'Matthew', abbreviation: 'Matt', testament: 'NT', chapters: 28, order: 40 },
        { id: 41, name: 'Mark', abbreviation: 'Mark', testament: 'NT', chapters: 16, order: 41 },
        { id: 42, name: 'Luke', abbreviation: 'Luke', testament: 'NT', chapters: 24, order: 42 },
        { id: 43, name: 'John', abbreviation: 'John', testament: 'NT', chapters: 21, order: 43 },
        { id: 44, name: 'Acts', abbreviation: 'Acts', testament: 'NT', chapters: 28, order: 44 },
        { id: 45, name: 'Romans', abbreviation: 'Rom', testament: 'NT', chapters: 16, order: 45 },
        { id: 46, name: '1 Corinthians', abbreviation: '1Cor', testament: 'NT', chapters: 16, order: 46 },
        { id: 47, name: '2 Corinthians', abbreviation: '2Cor', testament: 'NT', chapters: 13, order: 47 },
        { id: 48, name: 'Galatians', abbreviation: 'Gal', testament: 'NT', chapters: 6, order: 48 },
        { id: 49, name: 'Ephesians', abbreviation: 'Eph', testament: 'NT', chapters: 6, order: 49 },
        { id: 50, name: 'Philippians', abbreviation: 'Phil', testament: 'NT', chapters: 4, order: 50 },
        { id: 54, name: '1 Timothy', abbreviation: '1Tim', testament: 'NT', chapters: 6, order: 54 },
        { id: 58, name: 'Hebrews', abbreviation: 'Heb', testament: 'NT', chapters: 13, order: 58 },
        { id: 62, name: '1 John', abbreviation: '1Jn', testament: 'NT', chapters: 5, order: 62 },
        { id: 66, name: 'Revelation', abbreviation: 'Rev', testament: 'NT', chapters: 22, order: 66 },
    ];
    for (const book of bibleBooks) {
        await prisma.bibleBook.upsert({
            where: { id: book.id },
            update: {},
            create: book,
        });
    }
    // ── Demo quiz ────────────────────────────────────────────────────────────
    const quiz = await prisma.quiz.create({
        data: {
            churchId: church.id,
            title: 'Sunday Scripture Challenge',
            description: 'Test your knowledge of this week\'s scriptures',
            status: 'DRAFT',
            timeLimitSecs: 30,
            shuffleQuestions: true,
            questions: {
                create: [
                    {
                        text: 'What does Romans 8:28 say about God working for the good?',
                        options: [
                            { id: 'a', text: 'For those who love Him', isCorrect: true },
                            { id: 'b', text: 'For everyone equally', isCorrect: false },
                            { id: 'c', text: 'For the righteous only', isCorrect: false },
                            { id: 'd', text: 'For the church leaders', isCorrect: false },
                        ],
                        explanation: 'Romans 8:28 — "And we know that in all things God works for the good of those who love him"',
                        points: 10,
                        order: 1,
                    },
                    {
                        text: 'In John 3:16, what does God give as an expression of His love?',
                        options: [
                            { id: 'a', text: 'His only Son', isCorrect: true },
                            { id: 'b', text: 'Eternal wisdom', isCorrect: false },
                            { id: 'c', text: 'The Holy Spirit', isCorrect: false },
                            { id: 'd', text: 'The Scriptures', isCorrect: false },
                        ],
                        explanation: 'John 3:16 — "For God so loved the world that he gave his one and only Son"',
                        points: 10,
                        order: 2,
                    },
                ],
            },
        },
    });
    console.log('✅ Seeding complete!');
    console.log(`  Church: ${church.name} (${church.slug})`);
    console.log(`  Admin: admin@glorycast.ai / Admin@123`);
    console.log(`  Producer: producer@glorycast.ai / Producer@123`);
    console.log(`  Quiz: ${quiz.title}`);
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map