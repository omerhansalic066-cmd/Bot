/**
 * TürkiyeCraft All-in-One Discord Bot
 * Powered by ttcodersstudio | TürkiyeCraft
 */

const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType,
    PermissionsBitField,
    REST,
    Routes,
    SlashCommandBuilder
} = require('discord.js');
const util = require('minecraft-server-util');
const discordTranscripts = require('discord-html-transcripts');
const fs = require('fs');

// ==========================================
// [1] GENEL AYARLAR VE ID TANIMLARI
// ==========================================
const CONFIG = {
    TOKEN: "MTU1ODU3NjY2MjM0MDMxMzEwMA.GfOo-k.nxYMAYyhnQ95SQnYWt2CLyXwlmrWFMdDxqtsP0",
    CLIENT_ID: "1558576662340313100",
    GUILD_ID: "1542137972852523090",
    PREFIX: "!",

    SERVER: {
        NAME: "TürkiyeCraft",
        IP: "play.turkiyecraft.com.tr",
        PORT: 25565,
        VERSION: "1.19+ (Java & Bedrock)",
        ICON_URL: "https://i.imgur.com/vH9Z1Zm.png", // TürkiyeCraft Logo URL'si
        FOOTER: "Powered by ttcodersstudio | TürkiyeCraft"
    },

    ROLES: {
        KURUCU: "1542190089734590545",
        ADMIN: "1542220417182204075",
        YETKILI_EKIBI: "1555291547220574279",
        GOREVLI_GENEL: "1555291620876750918",
        GOREVLI_SKYBLOCK: "1555291670151561227",
        DESTEK_EKIBI: "1542296519628034128",
        BOOSTER: "1562109167634882710",
        // Seviye Rolleri
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
        // Log Kanalları
        LOG_MESSAGES: "1542146177665994862",
        LOG_PUNISH: "1542146207218929724",
        LOG_TICKET: "1556241725868081222",
        LOG_KONTROL: "1555275244980277258",
        WELCOME: "1542300436965490789",
        RULES: "1542141049118527568",
        BOOSTER_PANEL: "1555990802533056573",
        STATUS: "1542141104604840076",

        // Etkileşim Kanalları
        TICKET_OPEN: "1555902176382156840",
        TICKET_CATEGORY: "1542145901769003068",
        ONERI_OLUSTUR: "1542145766855020555",
        ONERI_LISTE: "1542150697523617863",
        HATA_OLUSTUR: "1555959502833057823",
        HATA_LISTE: "1555959597871669398",
        BASVURU_FORM: "1556051449723748443",
        HESAP_ESLE: "1555916520306254027",
        TEMP_VOICE_CATEGORY: "1542194376032129125",
        TEMP_VOICE_CREATOR: "1542194628332101694"
    }
};

// Basit Yerel Veri Kayıtları (JSON)
let xpData = {};
if (fs.existsSync('./levels.json')) {
    try { xpData = JSON.parse(fs.readFileSync('./levels.json', 'utf8')); } catch (e) { xpData = {}; }
}
function saveXP() {
    fs.writeFileSync('./levels.json', JSON.stringify(xpData, null, 2));
}

const invitesCache = new Map();
const userSpamMap = new Map();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildInvites
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

// ==========================================
// [2] SLASH KOMUTLARI TANIMLAMALARI
// ==========================================
const slashCommands = [
    new SlashCommandBuilder().setName('yanıt').setDescription('Destek talebine hazır yanıt penceresini açar.'),
    new SlashCommandBuilder()
        .setName('duyuru')
        .setDescription('Resmi TürkiyeCraft duyurusu yayınlar.')
        .addChannelOption(o => o.setName('kanal').setDescription('Duyurunun gideceği kanal').setRequired(true))
        .addStringOption(o => o.setName('baslik').setDescription('Duyuru başlığı').setRequired(true))
        .addStringOption(o => o.setName('icerik').setDescription('Duyuru metni').setRequired(true))
        .addStringOption(o => o.setName('gorsel').setDescription('Görsel URL linki').setRequired(false)),
    new SlashCommandBuilder()
        .setName('çekiliş')
        .setDescription('Çekiliş başlatır.')
        .addStringOption(o => o.setName('odul').setDescription('Çekiliş ödülü').setRequired(true))
        .addIntegerOption(o => o.setName('kazanan').setDescription('Kazanan kişi sayısı').setRequired(true))
        .addIntegerOption(o => o.setName('sure').setDescription('Süre (Dakika)').setRequired(true)),
    new SlashCommandBuilder()
        .setName('incele')
        .setDescription('Kullanıcının ceza ve sistem geçmişini inceler.')
        .addUserOption(o => o.setName('kullanici').setDescription('İncelenecek kullanıcı').setRequired(true)),
    new SlashCommandBuilder().setName('kont-panel').setDescription('Hile Kontrol log bildirim panelini açar.')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);

// ==========================================
// [3] BOT READY & PERİYODİK GÖREVLER
// ==========================================
client.once('ready', async () => {
    console.log(`[TÜRKIYECRAFT] ${client.user.tag} botu operasyona hazır!`);

    try {
        await rest.put(Routes.applicationGuildCommands(CONFIG.CLIENT_ID, CONFIG.GUILD_ID), { body: slashCommands });
        console.log('[TÜRKIYECRAFT] Slash komutları kaydedildi.');
    } catch (err) {
        console.error('Slash komut hatası:', err);
    }

    // Davetleri hafızaya al (Hoş geldin takibi için)
    const guild = client.guilds.cache.get(CONFIG.GUILD_ID);
    if (guild) {
        const guildInvites = await guild.invites.fetch().catch(() => new Map());
        guildInvites.forEach(inv => invitesCache.set(inv.code, inv.uses));
    }

    // 5 Dakikada Bir Sunucu Durumu Güncelleme
    setInterval(updateServerStatus, 5 * 60 * 1000);
    updateServerStatus();
});

// Canlı Sunucu Durumu Fonksiyonu
async function updateServerStatus() {
    const guild = client.guilds.cache.get(CONFIG.GUILD_ID);
    if (!guild) return;

    let online = 0;
    let max = 0;
    let isUp = false;

    try {
        const res = await util.status(CONFIG.SERVER.IP, CONFIG.SERVER.PORT, { timeout: 3000 });
        online = res.players.online;
        max = res.players.max;
        isUp = true;
    } catch (e) {
        isUp = false;
    }

    // Bot Aktivitesi
    client.user.setActivity(isUp ? `${CONFIG.SERVER.IP} (${online}/${max})` : `Bakımda: ${CONFIG.SERVER.IP}`);

    // Sunucu Durum Kanalı Embed Güncelleme
    const statusChannel = guild.channels.cache.get(CONFIG.CHANNELS.STATUS);
    if (statusChannel && statusChannel.isTextBased()) {
        const embed = new EmbedBuilder()
            .setColor(isUp ? '#2ecc71' : '#e74c3c')
            .setAuthor({ name: `${CONFIG.SERVER.NAME} • Canlı Ağ Durumu`, iconURL: CONFIG.SERVER.ICON_URL })
            .setThumbnail(CONFIG.SERVER.ICON_URL)
            .setDescription(`Aşağıda **${CONFIG.SERVER.NAME}** sunucusunun anlık bağlantı verileri yer almaktadır. Sunucumuz çok yakında kapılarını açıyor!`)
            .addFields(
                { name: '🌐 Sunucu IP', value: `\`${CONFIG.SERVER.IP}\``, inline: true },
                { name: '🟢 Durum', value: isUp ? '`Aktif / Canlı`' : '`Yakında Açılıyor / Bakım`', inline: true },
                { name: '👥 Çevrimiçi', value: `\`${online} / ${max}\``, inline: true },
                { name: '⚡ Sürüm', value: `\`${CONFIG.SERVER.VERSION}\``, inline: false }
            )
            .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
            .setTimestamp();

        // Kanalın son mesajını güncelle veya yeni at
        const messages = await statusChannel.messages.fetch({ limit: 5 });
        const lastBotMsg = messages.find(m => m.author.id === client.user.id);
        if (lastBotMsg) {
            await lastBotMsg.edit({ embeds: [embed] }).catch(() => {});
        } else {
            await statusChannel.send({ embeds: [embed] }).catch(() => {});
        }
    }
}

// ==========================================
// [4] PREFIX KOMUTLARI (!ip, !durum, !paneller-kur)
// ==========================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // GÜVENLİK KORUMALARI (Spam, CapsLock, Küfür Filtresi)
    if (checkSecurityViolations(message)) return;

    // OTOMATİK CEVAP SİSTEMİ
    const lowMsg = message.content.toLowerCase().trim();
    if (lowMsg === 'sa' || lowMsg === 'sea') {
        return message.reply(`Aleyküm Selam, **${message.author.username}**! ${CONFIG.SERVER.NAME}'a hoş geldin.`);
    } else if (lowMsg === 'ip' || lowMsg === 'ip ne') {
        return message.reply(`🌐 Sunucu IP Adresimiz: **${CONFIG.SERVER.IP}** (Sürüm: ${CONFIG.SERVER.VERSION})`);
    }

    // SEVİYE VE XP SİSTEMİ
    handleLevelXP(message);

    if (!message.content.startsWith(CONFIG.PREFIX)) return;
    const args = message.content.slice(CONFIG.PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // !ip, !mc, !durum
    if (['ip', 'mc', 'durum'].includes(cmd)) {
        try {
            const status = await util.status(CONFIG.SERVER.IP, CONFIG.SERVER.PORT, { timeout: 3000 });
            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setAuthor({ name: `${CONFIG.SERVER.NAME} • Sunucu Durumu`, iconURL: CONFIG.SERVER.ICON_URL })
                .setThumbnail(CONFIG.SERVER.ICON_URL)
                .setDescription(`Aşağıda **${CONFIG.SERVER.NAME}** sunucu bilgileri listelenmiştir.`)
                .addFields(
                    { name: '🌐 Sunucu IP', value: `\`${CONFIG.SERVER.IP}\``, inline: true },
                    { name: '🟢 Durum', value: '`Aktif`', inline: true },
                    { name: '👥 Çevrimiçi', value: `\`${status.players.online} / ${status.players.max}\``, inline: true },
                    { name: '⚡ Sürüm', value: `\`${CONFIG.SERVER.VERSION}\``, inline: false }
                )
                .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        } catch {
            const errEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setAuthor({ name: `${CONFIG.SERVER.NAME} • Sunucu Kapalı / Bakımda`, iconURL: CONFIG.SERVER.ICON_URL })
                .setDescription(`Sunucumuz şu anda hazırlık aşamasında veya bakım modundadır.\nÇok yakında sizlerle!\n🌐 **IP:** \`${CONFIG.SERVER.IP}\``)
                .setFooter({ text: CONFIG.SERVER.FOOTER });
            return message.reply({ embeds: [errEmbed] });
        }
    }

    // Panelleri Tek Komutla Oluşturma (!paneller-kur)
    if (cmd === 'paneller-kur' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        buildAllPanels(message.guild);
        return message.reply('✅ Bütün sistem panelleri tanımlanan kanallara başarıyla yüklendi.');
    }
});

// ==========================================
// [5] GÜVENLİK VE LOG KONTROLLERİ
// ==========================================
function checkSecurityViolations(message) {
    if (message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages)) return false;

    const text = message.content;
    const logChannel = message.guild.channels.cache.get(CONFIG.CHANNELS.LOG_PUNISH);

    // 1. Küfür Koruması
    const kufurler = ['amk', 'aq', 'oç', 'piç', 'sik', 'yarrak', 'orospu', 'kahpe'];
    const kelimeler = text.toLowerCase().split(/\s+/);
    if (kelimeler.some(k => kufurler.includes(k))) {
        message.delete().catch(() => {});
        message.channel.send(`⚠️ ${message.author}, lütfen sunucu içerisinde küfür ve argo kullanmayınız!`).then(m => setTimeout(() => m.delete(), 4000));
        if (logChannel) {
            logChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#e74c3c')
                        .setTitle('🛡️ Otomatik Küfür Filtresi')
                        .setDescription(`**Kullanıcı:** ${message.author} (${message.author.id})\n**Kanal:** ${message.channel}\n**Mesaj:** \`${text}\``)
                        .setFooter({ text: CONFIG.SERVER.FOOTER })
                ]
            });
        }
        return true;
    }

    // 2. CapsLock Koruması (>%70 büyük harf & en az 8 harf)
    if (text.length >= 8) {
        const upperCount = text.replace(/[^A-ZÇĞİÖŞÜ]/g, "").length;
        if ((upperCount / text.length) >= 0.70) {
            message.delete().catch(() => {});
            message.channel.send(`⚠️ ${message.author}, lütfen büyük harf kullanımını sınırlandırın!`).then(m => setTimeout(() => m.delete(), 4000));
            return true;
        }
    }

    // 3. Spam Koruması (5 saniyede 5 mesaj)
    const now = Date.now();
    const userSpam = userSpamMap.get(message.author.id) || [];
    const recentMessages = userSpam.filter(t => now - t < 5000);
    recentMessages.push(now);
    userSpamMap.set(message.author.id, recentMessages);

    if (recentMessages.length >= 5) {
        message.delete().catch(() => {});
        message.member.timeout(60 * 1000, "Spam koruması tetiklendi.").catch(() => {});
        message.channel.send(`🛑 ${message.author} spam yaptığı gerekçesiyle 1 dakika süreyle susturuldu.`);
        return true;
    }

    return false;
}

// Log: Mesaj Silinmesi
client.on('messageDelete', async (message) => {
    if (!message.guild || message.author?.bot) return;
    const logChannel = message.guild.channels.cache.get(CONFIG.CHANNELS.LOG_MESSAGES);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setAuthor({ name: '🗑️ Mesaj Silindi', iconURL: CONFIG.SERVER.ICON_URL })
        .setDescription(`**Yazar:** ${message.author} (${message.author.id})\n**Kanal:** ${message.channel}\n\n**Silinen İçerik:**\n> ${message.content || 'Görsel / Dosya'}`)
        .setFooter({ text: CONFIG.SERVER.FOOTER })
        .setTimestamp();
    logChannel.send({ embeds: [embed] }).catch(() => {});
});

// Log: Mesaj Düzenlenmesi
client.on('messageUpdate', async (oldMsg, newMsg) => {
    if (!oldMsg.guild || oldMsg.author?.bot || oldMsg.content === newMsg.content) return;
    const logChannel = oldMsg.guild.channels.cache.get(CONFIG.CHANNELS.LOG_MESSAGES);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setAuthor({ name: '✏️ Mesaj Düzenlendi', iconURL: CONFIG.SERVER.ICON_URL })
        .setDescription(`**Yazar:** ${oldMsg.author} (${oldMsg.author.id})\n**Kanal:** ${oldMsg.channel}`)
        .addFields(
            { name: 'Eski Hali', value: `> ${oldMsg.content || 'Boş'}`, inline: false },
            { name: 'Yeni Hali', value: `> ${newMsg.content || 'Boş'}`, inline: false }
        )
        .setFooter({ text: CONFIG.SERVER.FOOTER })
        .setTimestamp();
    logChannel.send({ embeds: [embed] }).catch(() => {});
});

// ==========================================
// [6] HOŞ GELDİN & DAVET TAKİBİ
// ==========================================
client.on('guildMemberAdd', async (member) => {
    const welcomeChannel = member.guild.channels.cache.get(CONFIG.CHANNELS.WELCOME);
    if (!welcomeChannel) return;

    let inviterText = "Keşif / Özel Bağlantı";
    try {
        const newInvites = await member.guild.invites.fetch();
        const usedInvite = newInvites.find(i => (invitesCache.get(i.code) || 0) < i.uses);
        if (usedInvite && usedInvite.inviter) {
            inviterText = `${usedInvite.inviter.username} davetiyle katıldı.`;
            invitesCache.set(usedInvite.code, usedInvite.uses);
        }
    } catch {}

    const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setAuthor({ name: `${CONFIG.SERVER.NAME} Topluluğuna Hoş Geldin!`, iconURL: member.user.displayAvatarURL() })
        .setThumbnail(member.user.displayAvatarURL())
        .setDescription(`Selam ${member}! Sunucumuzun büyüyen bir parçası olduğun için mutluyuz.\n\n` +
            `📜 Kurallarımızı <#${CONFIG.CHANNELS.RULES}> kanalından okumayı unutma!\n` +
            `🔗 Minecraft Adresimiz: \`${CONFIG.SERVER.IP}\`\n\n` +
            `🎯 **Geliş Yolu:** \`${inviterText}\``
        )
        .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
        .setTimestamp();

    welcomeChannel.send({ content: `👋 Merhaba ${member}!`, embeds: [embed] }).catch(() => {});
});

// ==========================================
// [7] SEVİYE & ÖZEL ROL MEKANİZMASI
// ==========================================
function handleLevelXP(message) {
    const userId = message.author.id;
    if (!xpData[userId]) xpData[userId] = { xp: 0, level: 1 };

    xpData[userId].xp += Math.floor(Math.random() * 8) + 3;
    const nextLevelXP = xpData[userId].level * 150;

    if (xpData[userId].xp >= nextLevelXP) {
        xpData[userId].level += 1;
        xpData[userId].xp = 0;
        saveXP();

        const curLevel = xpData[userId].level;
        message.channel.send(`🎉 Tebrikler ${message.author}! Seviye atladın: **Seviye ${curLevel}**`).then(m => setTimeout(() => m.delete(), 5000));

        // Rol Kontrolleri
        const member = message.member;
        for (const [key, val] of Object.entries(CONFIG.ROLES.LEVEL_ROLES)) {
            if (curLevel >= val.level && !member.roles.cache.has(val.id)) {
                member.roles.add(val.id).catch(() => {});
            }
        }
    }
}

// ==========================================
// [8] PANELLERİ OLUŞTURMA FONKSİYONU (!paneller-kur)
// ==========================================
async function buildAllPanels(guild) {
    // 1. Destek Talebi Paneli
    const ticketChannel = guild.channels.cache.get(CONFIG.CHANNELS.TICKET_OPEN);
    if (ticketChannel) {
        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setAuthor({ name: `${CONFIG.SERVER.NAME} Destek Merkezi`, iconURL: CONFIG.SERVER.ICON_URL })
            .setThumbnail(CONFIG.SERVER.ICON_URL)
            .setDescription(
                `Sunucumuzla ilgili tüm soru, öneri ve sorunlarınız için destek ekibimize buradan ulaşabilirsiniz.\n\n` +
                `**Talep Oluşturma Adımları**\n` +
                `1. Aşağıdaki menüden ilgilendiğiniz kategoriyi seçin.\n` +
                `2. Açılan forma oyun içi isminizi ve sorununuzu yazın.\n` +
                `3. Size özel açılan odada ekibimiz sizinle ilgilenecektir.\n\n` +
                `📌 **Bilgilendirme**\n` +
                `• Aynı anda yalnızca **bir** destek talebiniz açık olabilir.\n` +
                `• Talebiniz 24 saat yanıtsız kalırsa otomatik sonlandırılır.`
            )
            .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL });

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_ticket_category')
                .setPlaceholder('📁 Destek almak istediğiniz konuyu seçiniz...')
                .addOptions([
                    { label: 'Genel Destek', description: 'Hesap, mağaza ve site problemleri', value: 'genel', emoji: '📨' },
                    { label: 'Skyblock Destek', description: 'Skyblock moduyla ilişkili problemler', value: 'skyblock', emoji: '🏝️' }
                ])
        );
        ticketChannel.send({ embeds: [embed], components: [row] }).catch(() => {});
    }

    // 2. Takviyeci (Booster) Paneli
    const boostChannel = guild.channels.cache.get(CONFIG.CHANNELS.BOOSTER_PANEL);
    if (boostChannel) {
        const boosters = guild.members.cache.filter(m => m.premiumSince);
        const boostList = boosters.size > 0 
            ? boosters.map(b => `💎 ${b.user} - <t:${Math.floor(b.premiumSinceTimestamp / 1000)}:R> beri takviyeci`).slice(0, 8).join('\n')
            : 'Henüz takviye sağlayan bulunmamaktadır.';

        const embed = new EmbedBuilder()
            .setColor('#f47fff')
            .setAuthor({ name: `${CONFIG.SERVER.NAME} Takviye Panosu`, iconURL: CONFIG.SERVER.ICON_URL })
            .setDescription(
                `Sunucumuzu takviye ederek destekleyen tüm oyuncularımıza teşekkür ederiz. 💚\n\n` +
                `Takviye sağlayarak siz de sunucumuzda eşsiz ayrıcalıklardan yararlanabilirsiniz.\n\n` +
                `🚀 **Toplam Takviye:** \`${guild.premiumSubscriptionCount || 0}\`\n` +
                `👥 **Takviyeci Sayısı:** \`${boosters.size}\`\n` +
                `⭐ **Sunucu Seviyesi:** \`Seviye ${guild.premiumTier}\`\n\n` +
                `✨ **Takviyecilerimiz:**\n${boostList}`
            )
            .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_boost_check').setLabel('Boost Kontrol').setStyle(ButtonStyle.Success).setEmoji('💎')
        );
        boostChannel.send({ embeds: [embed], components: [row] }).catch(() => {});
    }

    // 3. Hesap Eşle Paneli (Şu An Devre Dışı)
    const linkChannel = guild.channels.cache.get(CONFIG.CHANNELS.HESAP_ESLE);
    if (linkChannel) {
        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setAuthor({ name: `${CONFIG.SERVER.NAME} Hesap Eşleme`, iconURL: CONFIG.SERVER.ICON_URL })
            .setDescription(
                `Oyun hesabınızın güvenliğini en üst düzeye çıkarmak ve topluluğumuzun parçası olduğunuzu göstermek için hesabınızı eşleyin!\n\n` +
                `**Neden Eşlemelisiniz?**\n` +
                `▸ Olası çalınma durumlarında hak sahipliği kanıtı.\n` +
                `▸ Discord içi özel çekilişlere ve etkinliklere katılım hakkı.\n` +
                `▸ İlk eşlemeye özel oyun içi sürpriz ödüller!\n\n` +
                `⚠️ *Bu sistem sunucumuz açıldığında aktif duruma getirilecektir.*`
            )
            .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_link_account').setLabel('Hesabını Eşle (Yakında)').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
        linkChannel.send({ embeds: [embed], components: [row] }).catch(() => {});
    }

    // 4. Yetkili Başvuru Paneli
    const staffAppChannel = guild.channels.cache.get(CONFIG.CHANNELS.BASVURU_FORM);
    if (staffAppChannel) {
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setAuthor({ name: `${CONFIG.SERVER.NAME} Yetkili Alımları`, iconURL: CONFIG.SERVER.ICON_URL })
            .setDescription(
                `Ekibimize katılarak ${CONFIG.SERVER.NAME} topluluğunu birlikte geliştirmek ister misiniz?\n\n` +
                `Aşağıdaki **Başvuru Yap** butonuna tıklayarak formu eksiksiz bir şekilde doldurunuz. Başvurunuz gizli bir alt başlık üzerinden yetkililerimizle değerlendirilecektir.`
            )
            .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_staff_apply').setLabel('Başvuru Yap').setStyle(ButtonStyle.Primary).setEmoji('📝')
        );
        staffAppChannel.send({ embeds: [embed], components: [row] }).catch(() => {});
    }

    // 5. Öneri & Hata Bildirim Panelleri
    const oneriChannel = guild.channels.cache.get(CONFIG.CHANNELS.ONERI_OLUSTUR);
    if (oneriChannel) {
        const embed = new EmbedBuilder()
            .setColor('#f1c40f')
            .setAuthor({ name: `${CONFIG.SERVER.NAME} Öneri Merkezi`, iconURL: CONFIG.SERVER.ICON_URL })
            .setDescription(`Aklınıza gelen fikirleri bize sunarak TürkiyeCraft kalitesini artırabilirsiniz. Formu açmak için butona basınız.`);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_create_suggestion').setLabel('Öneri Bildir').setStyle(ButtonStyle.Success).setEmoji('💡')
        );
        oneriChannel.send({ embeds: [embed], components: [row] }).catch(() => {});
    }

    const hataChannel = guild.channels.cache.get(CONFIG.CHANNELS.HATA_OLUSTUR);
    if (hataChannel) {
        const embed = new EmbedBuilder()
            .setColor('#e67e22')
            .setAuthor({ name: `${CONFIG.SERVER.NAME} Hata / Bug Bildirimi`, iconURL: CONFIG.SERVER.ICON_URL })
            .setDescription(`Oyunda veya Discord'da rastladığınız açıkları ve hataları bize bildirerek hediyeler kazanabilirsiniz.`);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_create_bug').setLabel('Hata Bildir').setStyle(ButtonStyle.Danger).setEmoji('⚠️')
        );
        hataChannel.send({ embeds: [embed], components: [row] }).catch(() => {});
    }

    // 6. Kurallar Paneli
    const ruleChannel = guild.channels.cache.get(CONFIG.CHANNELS.RULES);
    if (ruleChannel) {
        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setAuthor({ name: `${CONFIG.SERVER.NAME} Resmi Sunucu Kuralları`, iconURL: CONFIG.SERVER.ICON_URL })
            .setDescription(
                `1. **Saygı ve Ahlak:** Topluluk üyelerine küfür, hakaret ve argo kesinlikle yasaktır.\n` +
                `2. **Hile ve Üçüncü Parti Yazılımlar:** Oyun dengesini bozan her türlü makro, hile ve client sınırsız yasaklama sebebidir.\n` +
                `3. **Reklam ve Tanıtım:** Başka Discord, Minecraft veya YouTube kanallarının tanıtımını yapmak yasaktır.\n` +
                `4. **Yetkili Desteği:** Yetkilileri boş yere etiketlemeyiniz; sorunlarınızı Destek Talebi kanallarından iletiniz.`
            )
            .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL });
        ruleChannel.send({ embeds: [embed] }).catch(() => {});
    }
}

// ==========================================
// [9] INTERACTION YÖNETİMİ (BUTON, MODAL, SLASH)
// ==========================================
client.on('interactionCreate', async (interaction) => {

    // --- SLASH KOMUTLARI ---
    if (interaction.isChatInputCommand()) {
        // /yanıt
        if (interaction.commandName === 'yanıt') {
            const isStaff = interaction.member.roles.cache.has(CONFIG.ROLES.YETKILI_EKIBI) || interaction.member.roles.cache.has(CONFIG.ROLES.GOREVLI_GENEL);
            if (!isStaff) return interaction.reply({ content: '❌ Yetkiniz bulunmuyor.', ephemeral: true });

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_quick_reply')
                    .setPlaceholder('💬 İletmek istediğiniz yanıt şablonunu seçin...')
                    .addOptions([
                        { label: 'Destek Talebi Çözüldü', value: 'cozuldu', emoji: '✅', description: 'Gerekli işlemler tamamlandı.' },
                        { label: 'Ek Kanıt / Video Talebi', value: 'kanit', emoji: '📷', description: 'Kullanıcıdan kanıt isteme mesajı.' },
                        { label: 'Üst Yönetime Aktarıldı', value: 'yonetim', emoji: '⏳', description: 'İnceleme sürecine geçildi mesajı.' }
                    ])
            );
            return interaction.reply({ content: 'Hazır yanıt seçiniz:', components: [row], ephemeral: true });
        }

        // /duyuru
        if (interaction.commandName === 'duyuru') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: 'Yetkiniz yetersiz.', ephemeral: true });
            }
            const targetChannel = interaction.options.getChannel('kanal');
            const baslik = interaction.options.getString('baslik');
            const icerik = interaction.options.getString('icerik');
            const gorsel = interaction.options.getString('gorsel');

            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setAuthor({ name: `${CONFIG.SERVER.NAME} • Resmi Duyuru`, iconURL: CONFIG.SERVER.ICON_URL })
                .setTitle(baslik)
                .setDescription(icerik)
                .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
                .setTimestamp();
            if (gorsel) embed.setImage(gorsel);

            await targetChannel.send({ content: '@everyone', embeds: [embed] });
            return interaction.reply({ content: `Duyuru ${targetChannel} kanalında yayınlandı.`, ephemeral: true });
        }

        // /çekiliş
        if (interaction.commandName === 'çekiliş') {
            const odul = interaction.options.getString('odul');
            const kazanan = interaction.options.getInteger('kazanan');
            const sure = interaction.options.getInteger('sure');

            const bitisZamani = Math.floor((Date.now() + (sure * 60 * 1000)) / 1000);
            const embed = new EmbedBuilder()
                .setColor('#f1c40f')
                .setAuthor({ name: '🎉 ÇEKİLİŞ BAŞLADI 🎉', iconURL: CONFIG.SERVER.ICON_URL })
                .setTitle(odul)
                .setDescription(`Aşağıdaki butona basarak çekilişe katılabilirsiniz!\n\n` +
                    `👑 **Kazanan Sayısı:** \`${kazanan}\`\n` +
                    `⏰ **Bitiş:** <t:${bitisZamani}:R>`
                )
                .setFooter({ text: CONFIG.SERVER.FOOTER });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`giveaway_join_${Date.now()}`).setLabel('Katıl (0)').setStyle(ButtonStyle.Success).setEmoji('🎉')
            );

            return interaction.reply({ embeds: [embed], components: [row] });
        }

        // /kont-panel (Hile Kontrol Log Giriş Paneli)
        if (interaction.commandName === 'kont-panel') {
            const isStaff = interaction.member.roles.cache.has(CONFIG.ROLES.YETKILI_EKIBI);
            if (!isStaff) return interaction.reply({ content: 'Yetkiniz yok.', ephemeral: true });

            const modal = new ModalBuilder().setCustomId('modal_kont_entry').setTitle('Hile Kontrol / AAC Bildirimi');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('kont_ign').setLabel('Oyuncu Nicki').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('kont_durum').setLabel('Kontrol Durumu (Temiz/Hile/Kaçtı)').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('kont_hack').setLabel('Tespit Edilen Hile / Client').setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('kont_kanit').setLabel('Görsel/Video Kanıt Bağlantısı').setStyle(TextInputStyle.Paragraph).setRequired(false))
            );
            return interaction.showModal(modal);
        }

        // /incele
        if (interaction.commandName === 'incele') {
            const user = interaction.options.getUser('kullanici');
            const userLvl = xpData[user.id] || { level: 1, xp: 0 };
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setAuthor({ name: `${user.username} Profil İncelemesi`, iconURL: user.displayAvatarURL() })
                .addFields(
                    { name: 'Kullanıcı ID', value: `\`${user.id}\``, inline: true },
                    { name: 'Topluluk Seviyesi', value: `\`Seviye ${userLvl.level} (${userLvl.xp} XP)\``, inline: true },
                    { name: 'Hesap Oluşturulma', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: false }
                )
                .setFooter({ text: CONFIG.SERVER.FOOTER });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }

    // --- MENÜ ETKİLEŞİMLERİ ---
    if (interaction.isStringSelectMenu()) {
        // Hızlı Yanıt Seçimi
        if (interaction.customId === 'select_quick_reply') {
            const val = interaction.values[0];
            let title = "", desc = "", color = "#2ecc71";
            if (val === 'cozuldu') {
                title = "✅ Destek Talebi Çözüldü";
                desc = "Talebiniz kapsamında gerekli kontroller ve işlemler tamamlandı.\nSorununuzun çözüldüğünü düşünüyorsanız talep kapatılabilir.";
            } else if (val === 'kanit') {
                title = "📷 Kanıt ve Bilgi Talebi";
                desc = "İlettiğiniz durumu doğrulayabilmemiz adına ekran görüntüsü veya video kaydı iletmenizi rica ederiz.";
                color = "#3498db";
            } else if (val === 'yonetim') {
                title = "⏳ İnceleme Başlatıldı";
                desc = "Konu üst düzey yöneticilerimize aktarılmıştır, lütfen sabırla bekleyiniz.";
                color = "#f1c40f";
            }

            const replyEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(desc)
                .setFooter({ text: `Bu yanıt @${interaction.user.username} tarafından iletilmiştir. • ${CONFIG.SERVER.FOOTER}` });

            await interaction.channel.send({ embeds: [replyEmbed] });
            return interaction.update({ content: 'Hazır yanıt kanala gönderildi.', components: [] });
        }

        // Destek Formu Açma
        if (interaction.customId === 'menu_ticket_category') {
            const cat = interaction.values[0];
            const modal = new ModalBuilder().setCustomId(`modal_ticket_open_${cat}`).setTitle(`${cat.toUpperCase()} Destek Talebi`);
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_ign').setLabel('Oyun İçi İsim (Minecraft Nick)').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_issue').setLabel('Sorun Özeti').setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            return interaction.showModal(modal);
        }
    }

    // --- BUTON İŞLEMLERİ ---
    if (interaction.isButton()) {
        const { customId, guild, member, user, channel } = interaction;

        // Boost Kontrol Butonu
        if (customId === 'btn_boost_check') {
            const isBooster = member.roles.cache.has(CONFIG.ROLES.BOOSTER);
            return interaction.reply({
                content: isBooster ? '💎 Sunucumuza takviye basmış durumdasınız, desteğiniz için teşekkür ederiz!' : '❌ Şu an aktif bir takviyeniz bulunmuyor.',
                ephemeral: true
            });
        }

        // Destek Talebi: Üstlen
        if (customId === 'btn_ticket_claim') {
            const isStaff = member.roles.cache.has(CONFIG.ROLES.YETKILI_EKIBI) || member.roles.cache.has(CONFIG.ROLES.GOREVLI_GENEL);
            if (!isStaff) return interaction.reply({ content: 'Bu butonu sadece yetkililer kullanabilir.', ephemeral: true });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claimed_btn').setLabel(`${user.username} İlgileniyor`).setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('btn_ticket_close').setLabel('Talebi Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );
            await interaction.update({ components: [row] });
            return channel.send({ content: `🛡️ Bu talep **${user}** tarafından üstlenilmiştir.` });
        }

        // Destek Talebi: Kapat & HTML Transcript
        if (customId === 'btn_ticket_close') {
            await interaction.reply('🔒 Talep sonlandırılıyor, transkript arşive kaydediliyor...');
            setTimeout(async () => {
                try {
                    const file = await discordTranscripts.createTranscript(channel, {
                        limit: -1,
                        filename: `${channel.name}-transkript.html`,
                        saveImages: true,
                        footerText: CONFIG.SERVER.FOOTER
                    });

                    const logChannel = guild.channels.cache.get(CONFIG.CHANNELS.LOG_TICKET);
                    if (logChannel) {
                        const embed = new EmbedBuilder()
                            .setColor('#e74c3c')
                            .setTitle('📁 Destek Talebi Arşivlendi')
                            .addFields(
                                { name: 'Kanal', value: channel.name, inline: true },
                                { name: 'Kapatan', value: user.tag, inline: true }
                            )
                            .setFooter({ text: CONFIG.SERVER.FOOTER });
                        await logChannel.send({ embeds: [embed], files: [file] });
                    }
                    await channel.delete();
                } catch (e) {
                    console.error(e);
                }
            }, 4000);
        }

        // Öneri / Hata Modal Tetikleyicileri
        if (customId === 'btn_create_suggestion') {
            const modal = new ModalBuilder().setCustomId('modal_suggestion').setTitle('Öneri Bildir');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s_text').setLabel('Öneriniz').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            return interaction.showModal(modal);
        }

        if (customId === 'btn_create_bug') {
            const modal = new ModalBuilder().setCustomId('modal_bug').setTitle('Hata Bildir');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_text').setLabel('Karşılaştığınız Hata').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            return interaction.showModal(modal);
        }

        // Yetkili Başvuru Modalı
        if (customId === 'btn_staff_apply') {
            const modal = new ModalBuilder().setCustomId('modal_staff_app').setTitle('Yetkili Başvuru Formu');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('app_name_age').setLabel('İsim ve Yaşınız').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('app_exp').setLabel('Daha Önceki Deneyimleriniz').setStyle(TextInputStyle.Paragraph).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('app_q1').setLabel('Neden TürkiyeCraft?').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('app_q2').setLabel('Günde Kaç Saat Aktifsiniz?').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('app_q3').setLabel('Hile Tespitinde Ne Yaparsınız?').setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            return interaction.showModal(modal);
        }

        // Başvuru Onay / Red Butonları
        if (customId.startsWith('app_accept_') || customId.startsWith('app_reject_')) {
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: 'Yetkiniz yetersiz.', ephemeral: true });

            const isAccept = customId.startsWith('app_accept_');
            const targetUserId = customId.split('_')[2];
            const targetUser = await client.users.fetch(targetUserId).catch(() => null);

            if (isAccept) {
                await interaction.reply({ content: `✅ Başvuru onaylandı. ${targetUser} ekibe kabul edildi.` });
                targetUser?.send(`🎉 Tebrikler! **${CONFIG.SERVER.NAME}** yetkili başvurunuz onaylandı.`).catch(() => {});
            } else {
                await interaction.reply({ content: `❌ Başvuru reddedildi.` });
                targetUser?.send(`Maalesef, **${CONFIG.SERVER.NAME}** yetkili başvurunuz uygun görülmedi.`).catch(() => {});
            }
        }
    }

    // --- MODAL SUBMIT (FORM GÖNDERİMLERİ) ---
    if (interaction.isModalSubmit()) {
        const { customId, fields, user, guild } = interaction;

        // Destek Formu Oluşturma
        if (customId.startsWith('modal_ticket_open_')) {
            const category = customId.replace('modal_ticket_open_', '');
            const ign = fields.getTextInputValue('t_ign');
            const issue = fields.getTextInputValue('t_issue');

            const channelName = `${category}-${user.username}`.toLowerCase().replace(/[^a-z0-9]/g, '');
            const ch = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: CONFIG.CHANNELS.TICKET_CATEGORY || null,
                permissionOverwrites: [
                    { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
                    { id: CONFIG.ROLES.GOREVLI_GENEL, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                ]
            });

            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setAuthor({ name: `Destek Talebi #${Math.floor(1000 + Math.random() * 9000)}`, iconURL: CONFIG.SERVER.ICON_URL })
                .setDescription(`Sayın ${user}, destek talebiniz açıldı. Yetkililerimiz inceleyecektir.`)
                .addFields(
                    { name: '👤 Oyun İçi İsim', value: `\`${ign}\``, inline: true },
                    { name: '📂 Kategori', value: `\`${category.toUpperCase()}\``, inline: true },
                    { name: '📝 Sorun', value: `> ${issue}`, inline: false }
                )
                .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_ticket_claim').setLabel('Talebi Üstlen').setStyle(ButtonStyle.Success).setEmoji('🛡️'),
                new ButtonBuilder().setCustomId('btn_ticket_close').setLabel('Talebi Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            await ch.send({ content: `<@&${CONFIG.ROLES.DESTEK_EKIBI}> • ${user}`, embeds: [embed], components: [row] });
            return interaction.reply({ content: `✅ Destek talebiniz oluşturuldu: ${ch}`, ephemeral: true });
        }

        // Öneri Gönderimi (Oylamalı)
        if (customId === 'modal_suggestion') {
            const text = fields.getTextInputValue('s_text');
            const targetChannel = guild.channels.cache.get(CONFIG.CHANNELS.ONERI_LISTE);
            if (targetChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#f1c40f')
                    .setAuthor({ name: `${user.username} Tarafından Yeni Öneri`, iconURL: user.displayAvatarURL() })
                    .setDescription(`> ${text}`)
                    .setFooter({ text: CONFIG.SERVER.FOOTER })
                    .setTimestamp();
                const msg = await targetChannel.send({ embeds: [embed] });
                await msg.react('🟢');
                await msg.react('🔴');
            }
            return interaction.reply({ content: '✅ Öneriniz oylama kanalına aktarıldı.', ephemeral: true });
        }

        // Hata Bildirimi (Oylamalı)
        if (customId === 'modal_bug') {
            const text = fields.getTextInputValue('b_text');
            const targetChannel = guild.channels.cache.get(CONFIG.CHANNELS.HATA_LISTE);
            if (targetChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#e67e22')
                    .setAuthor({ name: `Hata Bildirimi • ${user.username}`, iconURL: user.displayAvatarURL() })
                    .setDescription(`> ${text}`)
                    .setFooter({ text: CONFIG.SERVER.FOOTER })
                    .setTimestamp();
                const msg = await targetChannel.send({ embeds: [embed] });
                await msg.react('✅');
                await msg.react('❌');
            }
            return interaction.reply({ content: '✅ Hata bildiriminiz yetkililere iletildi.', ephemeral: true });
        }

        // Yetkili Başvuru Formu Gönderimi (Özel Thread)
        if (customId === 'modal_staff_app') {
            const nameAge = fields.getTextInputValue('app_name_age');
            const exp = fields.getTextInputValue('app_exp');
            const q1 = fields.getTextInputValue('app_q1');
            const q2 = fields.getTextInputValue('app_q2');
            const q3 = fields.getTextInputValue('app_q3');

            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle(`Yetkili Başvurusu: ${nameAge}`)
                .setDescription(`**Başvuran:** ${user} (${user.id})`)
                .addFields(
                    { name: 'İsim / Yaş', value: nameAge, inline: true },
                    { name: 'Aktiflik Süresi', value: q2, inline: true },
                    { name: 'Deneyimler', value: `> ${exp}`, inline: false },
                    { name: 'Neden Biz?', value: `> ${q1}`, inline: false },
                    { name: 'Hileye Müdahale Planı', value: `> ${q3}`, inline: false }
                )
                .setFooter({ text: CONFIG.SERVER.FOOTER });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`app_accept_${user.id}`).setLabel('Onayla').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`app_reject_${user.id}`).setLabel('Reddet').setStyle(ButtonStyle.Danger)
            );

            // Başvuru kanalı içine özel Thread (Alt Başlık) açar
            const thread = await interaction.channel.threads.create({
                name: `başvuru-${user.username}`,
                autoArchiveDuration: 1440,
                type: ChannelType.PrivateThread
            });

            await thread.members.add(user.id);
            await thread.send({ embeds: [embed], components: [row] });

            return interaction.reply({ content: `✅ Başvurunuz alındı. İnceleme odanız: ${thread}`, ephemeral: true });
        }

        // Hile Kontrol / AAC Bildirimi Girişi
        if (customId === 'modal_kont_entry') {
            const ign = fields.getTextInputValue('kont_ign');
            const durum = fields.getTextInputValue('kont_durum');
            const hack = fields.getTextInputValue('kont_hack') || 'Belirtilmedi';
            const kanit = fields.getTextInputValue('kont_kanit') || 'Yok';

            const logCh = guild.channels.cache.get(CONFIG.CHANNELS.LOG_KONTROL);
            if (logCh) {
                const embed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setAuthor({ name: '🛡️ Hile Kontrol / AAC Kaydı', iconURL: CONFIG.SERVER.ICON_URL })
                    .addFields(
                        { name: 'Yetkili', value: `${user}`, inline: true },
                        { name: 'Şüpheli Oyuncu', value: `\`${ign}\``, inline: true },
                        { name: 'Kontrol Sonucu', value: `\`${durum}\``, inline: true },
                        { name: 'Yazılım Türü', value: hack, inline: true },
                        { name: 'Kanıt', value: kanit, inline: false }
                    )
                    .setFooter({ text: CONFIG.SERVER.FOOTER })
                    .setTimestamp();
                await logCh.send({ embeds: [embed] });
            }
            return interaction.reply({ content: '✅ Kontrol kaydı loglandı.', ephemeral: true });
        }... (2 KB kaldı)
