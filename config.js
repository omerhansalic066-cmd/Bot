try { require('dotenv').config(); } catch (e) {}

module.exports = {
    TOKEN: process.env.DISCORD_TOKEN,
    CLIENT_ID: "1558576662340313100",
    GUILD_ID: "1542137972852523090",
    PREFIX: "!",
    
    // Hem seni hem de mevcut kurucu ID'sini ekledik
    OWNER_ID: [
        "1429198833832951808", // Senin Discord ID'n
        "1430625826902114396"  // Diğer Kurucu ID'si
    ],

    SERVER: {
        NAME: "TürkiyeCraft",
        IP: "play.turkiyecraft.com.tr",
        PORT: 25565,
        VERSION: "1.19+ (Java & Bedrock)",
        ICON_URL: "https://cdn.discordapp.com/attachments/1542146154181951498/1562142076014166138/image_f2a40f2b.jpg",
        FOOTER: "Powered by ttcodersstudio | TürkiyeCraft"
    },

    ROLES: {
        YONETICI: "1562139033663180915",
        KURUCU: "1542190089734590545",
        ADMIN: "1542220417182204075",
        YETKILI_EKIBI: "1555291547220574279",
        GOREVLI_GENEL: "1555291620876750918",
        GOREVLI_SKYBLOCK: "1555291670151561227",
        DESTEK_EKIBI: "1542296519628034128",
        BOOSTER: "1562109167634882710",
        LEVEL_ROLES: {
            KOMUR: { level: 1, id: "1555989637183443125" },
            BAKIR: { level: 5, id: "1555989605357195364" },
            DEMIR: { level: 10, id: "1555989564823314482" },
            ALTIN: { level: 20, id: "1555989536558030939" },
            ELMAS: { level: 35, id: "1555989498280812615" },
            ZUMRUT: { level: 50, id: "1555989464751276173" },
            NETHERITE: { level: 75, id: "1555989344530202805" }
        }
    },

    CHANNELS: {
        LOG_MESSAGES: "1542146177665994862",
        LOG_PUNISH: "1542146207218929724",
        LOG_TICKET: "1556241725868081222",
        LOG_KONTROL: "1555275244980277258",
        WELCOME: "1542300436965490789",
        RULES: "1542141049118527568",
        BOOSTER_PANEL: "1555990802533056573",
        STATUS: "1542141104604840076",
        TICKET_OPEN: "1555902176382156840",
        TICKET_CATEGORY: "1542145901769003068",
        ONERI_OLUSTUR: "1542145766855020555",
        ONERI_LISTE: "1542150697523617863",
        HATA_OLUSTUR: "1555959502833057823",
        HATA_LISTE: "1555959597871669398",
        BASVURU_FORM: "1556051449723748443",
        HESAP_ESLE: "1555916520306254027",
        TEMP_VOICE_CATEGORY: "1542194376032129125",
        TEMP_VOICE_CREATOR: "1542194628332101694",
        GAME_COUNTING: "1562147448313348186",
        GAME_WORD: "1562147475274469456"
    },

    STATUS_MESSAGES: [
        "🌐 play.turkiyecraft.com.tr",
        "💎 Türkiye'nin En Kaliteli Sunucusu!",
        "🛠️ 7/24 Aktif Destek Sistemi",
        "📈 Bot Aktif | Yardim için !yardım"
    ]
};
