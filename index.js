const { 
    Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, ModalBuilder, 
    TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, AttachmentBuilder, ActivityType 
} = require('discord.js');
const { status } = require('minecraft-server-util');
const fs = require('fs');
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
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember, Partials.Reaction]
});

// --- SABİT BİLGİLER VE ID'LER (TÜRKİYECRAFT) ---
const PREFIX = '!';
const SERVER_NAME = "TürkiyeCraft";
const LOGO_URL = "https://cdn.phototourl.com/member/2026-10-04-f510ec96-2c1f-460d-b83b-1df025e95f83.jpg";
const FOOTER_TEXT = "Powered by ttcodersstudio";

const MAIN_IP = "play.turkiyecraft.com.tr";
const BOX_IP  = "box.turkiyecraft.com.tr";

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
    geciciKategori: "1542194376032129125",
    hosgeldinKanal: "1542141049118527568",
    logKanal: "1555902219050684526"
};

// 1430625826902114396 kurucular listesinde tam yetkilidir
const OWNERS = ["1430625826902114396", "1452002283389849690", "1429198833832951808"];

// --- VERİTABANI YÖNETİMİ (JSON) ---
const DATA_FILE = './data.json';
function loadData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            fs.writeFileSync(DATA_FILE, JSON.stringify({ totalTickets: 0, panelMessageId: null, warnings: {}, levels: {}, staffStats: {}, giveaways: {}, suggestions: { count: 0 } }, null, 2));
        }
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch {
        return { totalTickets: 0, panelMessageId: null, warnings: {}, levels: {}, staffStats: {}, giveaways: {}, suggestions: { count: 0 } };
    }
}
function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const openTickets = new Map();
const xpCooldown = new Map();
const tempChannels = new Map();

const XP_MIN = 15;
const XP_MAX = 25;
const XP_COOLDOWN_MS = 60_000;
const BAD_WORDS = ['sik', 'sikerim', 'orospu', 'piç', 'göt', 'yarrak', 'amk', 'amina', 'salak', 'aptal', 'mal'];
const LINK_REGEX = /https?:\/\/\S+|www\.\S+|discord\.(gg|com\/invite)\/\S+/gi;

const TICKET_TOPICS = [
    { label: 'Skyblock Destek', value: 'skyblock', emoji: '🏝️', description: 'Skyblock oyun modu ile ilgili sorunlar' },
    { label: 'Genel Destek', value: 'genel', emoji: '💬', description: 'Genel sunucu ve site destek talebi' },
    { label: 'Şikayet / Rapor', value: 'sikayet', emoji: '⚠️', description: 'Kullanıcı veya durum şikayeti' },
];

function calcLevel(xp) { return Math.floor(0.1 * Math.sqrt(xp)); }

// --- BOT HAZIR ---
client.once('ready', async () => {
    console.log(`🤖 ${client.user.tag} başarıyla TürkiyeCraft olarak aktif edildi!`);

    const updatePresence = () => {
        status(MAIN_IP, 25565, { timeout: 5000 })
            .then((response) => {
                const onlinePlayers = response.players.online;
                client.user.setActivity(`${SERVER_NAME} | ${onlinePlayers} Oyuncu Aktif`, { type: ActivityType.Playing });
            })
            .catch(() => {
                client.user.setActivity(`${SERVER_NAME} | Çevrimdışı ❌`, { type: ActivityType.Playing });
            });
    };
    updatePresence();
    setInterval(updatePresence, 30000);
});

// --- HOŞ GELDİN & OTO ROL ---
client.on('guildMemberAdd', async member => {
    const role = member.guild.roles.cache.get(ROLES.onayli);
    if (role) await member.roles.add(role).catch(() => {});

    const channel = member.guild.channels.cache.get(CHANNELS.hosgeldinKanal);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle(`👋 Hoş Geldin, ${member.user.username}!`)
        .setDescription(`**${SERVER_NAME}** sunucusuna hoş geldin, ${member}! 🎉\n\nIP Adresimiz: \`${MAIN_IP}\``)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();

    channel.send({ content: `${member}`, embeds: [embed] }).catch(() => {});
});

// --- MESAJ & KOMUT KONTROLLERİ ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    const isOwner = OWNERS.includes(message.author.id);
    const hasModPerms = message.member.permissions.has(PermissionFlagsBits.ManageMessages);
    const isPrivileged = isOwner || hasModPerms;

    // --- KOMUT İŞLEYİCİ (PREFIX SİSTEMİ) ---
    if (message.content.startsWith(PREFIX)) {
        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // 1. TEST KOMUTU
        if (command === 'test') {
            const isUserOwner = OWNERS.includes(message.author.id);
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle("⚙️ Sistem Test Paneli")
                        .setDescription(`Bot tamamen çalışır durumda!\n\n🏓 **Bot Gecikmesi:** \`${client.ws.ping}ms\`\n👑 **Yetki Seviyeniz:** ${isUserOwner ? "⭐ **Kurucu (Tam Yetki Aktif)**" : "Üye / Standart Yetkili"}\n📡 **Sunucu:** ${SERVER_NAME}`)
                        .setFooter({ text: FOOTER_TEXT })
                ]
            });
        }

        // 2. YARDIM KOMUTU
        if (command === 'yardim' || command === 'help') {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x5865f2)
                        .setTitle(`📖 ${SERVER_NAME} Komut Listesi`)
                        .setDescription(`
**Genel Komutlar:**
• \`${PREFIX}test\` : Botun aktifliğini ve pingini gösterir.
• \`${PREFIX}yardim\` : Bu menüyü gösterir.

**Yönetici/Kurucu Komutları:**
• \`${PREFIX}destek-kur\` : Destek paneli butonunu ilgili kanala atar.
• \`${PREFIX}oneri-kur\` : Öneri gönderme butonunu kanala atar.
• \`${PREFIX}temizle <sayı>\` : Belirtilen sayıda mesajı siler.
                        `)
                        .setFooter({ text: FOOTER_TEXT })
                ]
            });
        }

        // 3. DESTEK PANELİ KURMA KOMUTU (Sadece Kurucu veya Yönetici)
        if (command === 'destek-kur') {
            if (!isPrivileged) return message.reply("❌ Bu komutu kullanmak için yetkiniz yok!");

            const targetChannel = message.guild.channels.cache.get(CHANNELS.destekPanel) || message.channel;
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`🎫 ${SERVER_NAME} — Destek Talebi`)
                .setDescription("Oyun içi sorunlar, öneriler veya şikayetleriniz için aşağıdaki butona tıklayarak talep oluşturabilirsiniz.\n\nYetkili ekibimiz en kısa sürede dönüş sağlayacaktır.")
                .setFooter({ text: FOOTER_TEXT });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('open_ticket')
                    .setLabel('📩 Destek Talebi Aç')
                    .setStyle(ButtonStyle.Primary)
            );

            await targetChannel.send({ embeds: [embed], components: [row] });
            return message.reply(`✅ Destek paneli başarıyla ${targetChannel} kanalına gönderildi.`);
        }

        // 4. ÖNERİ PANELİ KURMA KOMUTU
        if (command === 'oneri-kur') {
            if (!isPrivileged) return message.reply("❌ Bu komutu kullanmak için yetkiniz yok!");

            const targetChannel = message.guild.channels.cache.get(CHANNELS.oneriPanel) || message.channel;
            const embed = new EmbedBuilder()
                .setColor(0x00FF88)
                .setTitle(`💡 ${SERVER_NAME} — Fikir & Öneri Bildirimi`)
                .setDescription("Sunucumuzu geliştirmemize yardımcı olmak ister misiniz? Aşağıdaki butona tıklayarak fikirlerinizi doğrudan bize ulaştırabilirsiniz.")
                .setFooter({ text: FOOTER_TEXT });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('suggest_open')
                    .setLabel('💡 Öneri Gönder')
                    .setStyle(ButtonStyle.Success)
            );

            await targetChannel.send({ embeds: [embed], components: [row] });
            return message.reply(`✅ Öneri paneli ${targetChannel} kanalına gönderildi.`);
        }

        // 5. TEMİZLE KOMUTU
        if (command === 'temizle' || command === 'sil') {
            if (!isPrivileged) return message.reply("❌ Bu işlem için mesaj silme yetkisine sahip olmalısınız.");
            const amount = parseInt(args[0]);
            if (isNaN(amount) || amount < 1 || amount > 100) {
                return message.reply("⚠️ Lütfen 1-100 arasında bir sayı belirtin. Örn: `!temizle 20`");
            }
            await message.channel.bulkDelete(amount, true).catch(() => {});
            const msg = await message.channel.send(`🧹 Başarıyla **${amount}** mesaj silindi.`);
            setTimeout(() => msg.delete().catch(() => {}), 3000);
            return;
        }
    }

    const lower = message.content.trim().toLowerCase();

    // Oto Yanıtlar
    if (lower === 'sa' || lower === 'selamun aleykum') return message.reply('Aleykümselam, hoş geldin! 👋');
    if (lower === 'iyi akşamlar') return message.reply('Sana da iyi akşamlar!');
    if (lower === 'günaydın') return message.reply('Günaydın! Keyifli oyunlar.');

    // Anti-Link & Küfür Filtresi (1430625826902114396 ve yetkililer engellenmez)
    if (!isPrivileged) {
        if (LINK_REGEX.test(message.content) || BAD_WORDS.some(w => lower.includes(w))) {
            LINK_REGEX.lastIndex = 0;
            await message.delete().catch(() => {});
            const warn = await message.channel.send(`⚠️ ${message.author}, bu sunucuda küfür veya link paylaşmak yasaktır!`);
            setTimeout(() => warn.delete().catch(() => {}), 4000);
            return;
        }
    }

    // XP Sistemi
    const now = Date.now();
    const lastXP = xpCooldown.get(message.author.id) || 0;
    if (now - lastXP >= XP_COOLDOWN_MS) {
        xpCooldown.set(message.author.id, now);
        const gained = Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;
        const data = loadData();
        if (!data.levels) data.levels = {};
        if (!data.levels[message.author.id]) data.levels[message.author.id] = { xp: 0, level: 0 };
        data.levels[message.author.id].xp += gained;
        const newLevel = calcLevel(data.levels[message.author.id].xp);
        if (newLevel > data.levels[message.author.id].level) {
            data.levels[message.author.id].level = newLevel;
            saveData(data);
            message.channel.send(`🎉 Tebrikler ${message.author}! **${newLevel}. seviyeye** ulaştın! 🏆`).catch(() => {});
        } else {
            saveData(data);
        }
    }
});

// --- GEÇİCİ SES ODALARI ---
client.on('voiceStateUpdate', async (oldState, newState) => {
    if (newState.channelId === CHANNELS.geciciKurma) {
        const guild = newState.guild;
        const member = newState.member;
        const channel = await guild.channels.create({
            name: `🔊 ${member.user.username}'in Odası`,
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
});

setInterval(() => {
    tempChannels.forEach(async (data, channelId) => {
        const channel = client.channels.cache.get(channelId);
        if (channel && channel.members.size === 0) {
            if (Date.now() - data.lastEmpty > 180000) {
                await channel.delete().catch(() => {});
                tempChannels.delete(channelId);
            }
        } else if (channel) {
            data.lastEmpty = Date.now();
        }
    });
}, 10000);

// --- ETKİLEŞİMLER (BUTONLAR, MENÜLER, MODALLAR) ---
client.on('interactionCreate', async interaction => {
    if (interaction.isButton() && interaction.customId === 'open_ticket') {
        const select = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ticket_topic')
                .setPlaceholder('📂 Destek konusu seçin...')
                .addOptions(TICKET_TOPICS.map(t => ({ label: t.label, value: t.value, description: t.description, emoji: t.emoji })))
        );
        await interaction.reply({ content: '📂 Lütfen talep türünü seçin:', components: [select], ephemeral: true });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_topic') {
        await interaction.deferUpdate();
        const topicVal = interaction.values[0];
        const topic = TICKET_TOPICS.find(t => t.value === topicVal);
        const guild = interaction.guild;
        const member = interaction.member;

        const channel = await guild.channels.create({
            name: `talep-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            type: ChannelType.GuildText,
            parent: CHANNELS.destekKategori,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                { id: ROLES.destekEkibi, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
            ]
        });

        const data = loadData();
        data.totalTickets = (data.totalTickets || 0) + 1;
        saveData(data);
        openTickets.set(channel.id, { userId: member.id, topic: topic.label });

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`${topic.emoji} ${topic.label} — Talep #${data.totalTickets}`)
            .setDescription(`Merhaba ${member}! Yetkili ekibi kısa sürede sizinle ilgilenecektir.`)
            .setFooter({ text: FOOTER_TEXT });

        const closeBtn = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Talebi Kapat').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `${member} | <@&${ROLES.destekEkibi}>`, embeds: [embed], components: [closeBtn] });
        await interaction.editReply({ content: `✅ Talep kanalınız açıldı: ${channel}`, components: [] });
    }

    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        await interaction.deferReply({ ephemeral: true });
        const channelId = interaction.channel.id;
        
        try {
            const fetched = await interaction.channel.messages.fetch({ limit: 100 });
            const sorted = [...fetched.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
            const transcriptText = sorted.map(m => `[${new Date(m.createdTimestamp).toLocaleString('tr-TR')}] ${m.author.tag}: ${m.content || '[Medya/Embed]'}`).join('\n');
            const attachment = new AttachmentBuilder(Buffer.from(transcriptText, 'utf-8'), { name: `transcript-${interaction.channel.name}.txt` });
            
            const logCh = interaction.guild.channels.cache.get(CHANNELS.logKanal);
            if (logCh) await logCh.send({ content: `📄 **${interaction.channel.name}** talebinin transkripti:`, files: [attachment] });
        } catch (e) { console.error("Transkript hatası:", e); }

        openTickets.delete(channelId);
        await interaction.editReply({ content: '🔒 Talep kapatılıyor, 5 saniye içinde silinecektir.' });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }

    // Öneri Paneli Butonu
    if (interaction.isButton() && interaction.customId === 'suggest_open') {
        const modal = new ModalBuilder().setCustomId('suggest_modal').setTitle('💡 Öneri Gönder');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('suggest_title').setLabel('Başlık').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('suggest_body').setLabel('Öneriniz').setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'suggest_modal') {
        const title = interaction.fields.getTextInputValue('suggest_title');
        const body = interaction.fields.getTextInputValue('suggest_body');
        const listChan = interaction.guild.channels.cache.get(CHANNELS.oneriListe);

        const embed = new EmbedBuilder()
            .setTitle(`💡 Öneri: ${title}`)
            .setDescription(body)
            .addFields({ name: '👤 Öneren', value: `${interaction.user}`, inline: true })
            .setColor(0x00FF00)
            .setFooter({ text: FOOTER_TEXT });

        const voteRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('oy_evet').setLabel('👍 Evet').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('oy_hayir').setLabel('👎 Hayır').setStyle(ButtonStyle.Danger)
        );

        if (listChan) await listChan.send({ embeds: [embed], components: [voteRow] });
        await interaction.reply({ content: '✅ Öneriniz başarıyla yayınlandı!', ephemeral: true });
    }

    if (interaction.isButton() && (interaction.customId === 'oy_evet' || interaction.customId === 'oy_hayir')) {
        await interaction.reply({ content: `Oyunuz kaydedildi: **${interaction.customId === 'oy_evet' ? 'Evet' : 'Hayır'}**`, ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
