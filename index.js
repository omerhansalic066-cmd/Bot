const { 
    Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, ModalBuilder, 
    TextInputBuilder, TextInputStyle, StringSelectMenuBuilder 
} = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember]
});

// --- VERİTABANI / BELLEK ---
const userCredits = new Map(); // Kredi sistemi için geçici bellek
const tempChannels = new Map(); // Geçici ses odaları için

// --- SABİT BİLGİLER VE ID'LER ---
const SERVER_NAME = "TürkiyeCraft";
const LOGO_URL = "https://cdn.phototourl.com/member/2026-10-04-f510ec96-2c1f-460d-b83b-1df025e95f83.jpg";
const FOOTER_TEXT = "Powered by ttcodersstudio • TürkiyeCraft";

const ROLES = {
    destekEkibi: "1542296519628034128",
    genelDestek: "1555291620876750918",
    skyblockDestek: "1555291670151561227",
    onayli: "1555294900520493118",
    vip: "1555294079921819849",
    rutbeler: {
        netherite: "1555989344530202805",
        zumrut: "1555989464751276173",
        elmas: "1555989498280812615",
        altin: "1555989536558030939",
        demir: "1555989564823314482",
        bakir: "1555989605357195364",
        komur: "1555989637183443125"
    }
};

const CHANNELS = {
    destekPanel: "1555902176382156840",
    destekKategori: "1555902219050684526",
    hesapEslestirme: "1555916520306254027",
    takviyeci: "1555990802533056573",
    oneriPanel: "1542145766855020555",
    hataPanel: "1555959502833057823",
    oneriListe: "1542150697523617863",
    hataListe: "1555959597871669398",
    basvuruSartlari: "1555272732566888488",
    basvuruPanel: "1556051449723748443",
    marketRol: "1555989121808465981",
    kurallar: "1542141049118527568",
    geciciKurma: "1542194628332101694",
    geciciKategori: "1542194376032129125"
};

const OWNERS = ["1430625826902114396", "1452002283389849690", "1429198833832951808"];

client.once('ready', async () => {
    console.log(`${client.user.tag} başarıyla giriş yaptı!`);
    
    // Slash Komutları Kaydı
    const commands = [
        { name: 'yardım', description: 'TürkiyeCraft bot yardım menüsü' },
        { name: 'temizle', description: 'Kanaldaki mesajları temizler', options: [{ name: 'sayi', type: 4, description: 'Silinecek mesaj sayısı', required: true }] },
        { name: 'krediekle', description: 'Oyuncuya kredi ekler (Kurucu)', options: [{ name: 'kullanici', type: 6, description: 'Hedef kullanıcı', required: true }, { name: 'miktar', type: 4, description: 'Kredi miktarı', required: true }] },
        { name: 'panelgönder', description: 'Tüm panelleri ilgili kanallara gönderir (Kurucu)' },
        { name: 'owner', description: 'Sadece kurucuların kullanabileceği sistem paneli' },
        { name: 'yanıt', description: 'Destek ekibinin hazır yanıtları', options: [{ name: 'secenek', type: 3, description: 'Yanıt seçin', required: true, choices: [
            { name: 'Sorununuz ile ilgileniliyor', value: '1' },
            { name: 'Lütfen oyundan tekrar denermisiniz', value: '2' },
            { name: 'Kanıt veya ekran görüntüsü atarmısınız', value: '3' }
        ]}] },
        { name: 'ticket-son', description: 'Destek talebini çözer ve kapatır' },
        { name: 'zar', description: 'Zar atar (1-6)' },
        { name: 'yazıtura', description: 'Yazı tura atar' },
        { name: 'günlüködül', description: 'Günlük rastgele kredi toplarsın' }
    ];

    await client.application.commands.set(commands);
});

// --- MESAJ & KORUMA & OTO YANIT SİSTEMİ ---
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // Küfür & Reklam Basit Koruma
    const kufurler = ["küfür1", "küfür2", "discord.gg/", "http://", "https://"];
    if (kufurler.some(k => message.content.toLowerCase().includes(k))) {
        if (!OWNERS.includes(message.author.id)) {
            message.delete().catch(() => {});
            return message.channel.send(`${message.author}, bu sunucuda küfür veya reklam yasaktır!`).then(msg => setTimeout(() => msg.delete(), 4000));
        }
    }

    // Büyük Harf Koruması (%70 üzeri büyük harfse)
    if (message.content.length > 10) {
        const uppercaseCount = message.content.replace(/[^A-ZÇĞİÖŞÜ]/g, "").length;
        if ((uppercaseCount / message.content.length) > 0.7) {
            message.delete().catch(() => {});
            return message.channel.send(`${message.author}, lütfen büyük harf kullanımına dikkat et!`).then(msg => setTimeout(() => msg.delete(), 4000));
        }
    }

    // Otomatik Yanıtlar
    const content = message.content.toLowerCase();
    if (content.includes("sa") || content.includes("selamın aleyküm")) {
        message.reply("Aleykümselam, hoş geldin TürkiyeCraft oyuncusu!");
    } else if (content.includes("iyi akşamlar")) {
        message.reply("Sana da iyi akşamlar! Keyifli oyunlar dileriz.");
    } else if (content.includes("günaydın")) {
        message.reply("Günaydın! Bugün TürkiyeCraft'ta maceraya hazır mısın?");
    } else if (content.includes("tünaydın")) {
        message.reply("Tünaydın! Oyun keyfin bol olsun.");
    } else if (content.includes("nasılsın") && content.includes(client.user.id)) {
        message.reply("Ben bir TürkiyeCraft yapay zeka asistanıyım, çok iyiyim! Sen nasılsın?");
    }
});

// --- GEÇİCİ SES ODA SİSTEMİ ---
client.on('voiceStateUpdate', async (oldState, newState) => {
    // Oda kurma kanalına girdiyse
    if (newState.channelId === CHANNELS.geciciKurma) {
        const guild = newState.guild;
        const member = newState.member;

        const channel = await guild.channels.create({
            name: `${member.user.username}'in Odası`,
            type: ChannelType.GuildVoice,
            parent: CHANNELS.geciciKategori,
            permissionOverwrites: [
                { id: guild.id, allow: [PermissionFlagsBits.Connect] },
                { id: member.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers] }
            ]
        });

        await member.voice.setChannel(channel);
        tempChannels.set(channel.id, { owner: member.id, lastEmpty: Date.now() });
    }

    // Odalar boş kalırsa silinme kontrolü (3dk)
    setInterval(() => {
        tempChannels.forEach(async (data, channelId) => {
            const channel = client.channels.cache.get(channelId);
            if (channel) {
                if (channel.members.size === 0) {
                    if (Date.now() - data.lastEmpty > 180000) { // 3 Dakika
                        await channel.delete().catch(() => {});
                        tempChannels.delete(
