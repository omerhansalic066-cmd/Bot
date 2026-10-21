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

const CONFIG = require('./config');
const { checkSecurityViolations } = require('./security');
const { buildAllPanels } = require('./panels');

// Yönetici Rolü ve Admin Doğrulama Fonksiyonu
function hasAdminPower(member) {
    if (!member) return false;
    return member.roles.cache.has(CONFIG.ROLES.YONETICI) ||
           member.roles.cache.has(CONFIG.ROLES.KURUCU) ||
           member.permissions.has(PermissionsBitField.Flags.Administrator) ||
           member.id === CONFIG.OWNER_ID;
}

// Seviye Veri Tabanı
let xpData = {};
if (fs.existsSync('./levels.json')) {
    try { xpData = JSON.parse(fs.readFileSync('./levels.json', 'utf8')); } catch { xpData = {}; }
}
function saveXP() {
    try { fs.writeFileSync('./levels.json', JSON.stringify(xpData, null, 2)); } catch {}
}

const invitesCache = new Map();

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

// Güncel Slash Komut Listesi
const slashCommands = [
    new SlashCommandBuilder().setName('yanıt').setDescription('Destek talebine hazır yanıt kalıbı gönderir.'),
    new SlashCommandBuilder()
        .setName('duyuru')
        .setDescription('Resmi TürkiyeCraft duyurusu yayınlar.')
        .addChannelOption(o => o.setName('kanal').setDescription('Duyuru kanalı').setRequired(true))
        .addStringOption(o => o.setName('baslik').setDescription('Duyuru başlığı').setRequired(true))
        .addStringOption(o => o.setName('icerik').setDescription('Duyuru metni').setRequired(true))
        .addStringOption(o => o.setName('gorsel').setDescription('Görsel URL linki').setRequired(false)),
    new SlashCommandBuilder()
        .setName('çekiliş')
        .setDescription('Çekiliş başlatır.')
        .addStringOption(o => o.setName('odul').setDescription('Ödül').setRequired(true))
        .addIntegerOption(o => o.setName('kazanan').setDescription('Kazanan sayısı').setRequired(true))
        .addIntegerOption(o => o.setName('sure').setDescription('Süre (Dakika)').setRequired(true)),
    new SlashCommandBuilder()
        .setName('incele')
        .setDescription('Kullanıcının profil ve seviye verilerini inceler.')
        .addUserOption(o => o.setName('kullanici').setDescription('İncelenecek kullanıcı').setRequired(true)),
    new SlashCommandBuilder().setName('kont-panel').setDescription('Hile Kontrol bildirim panelini açar.'),
    new SlashCommandBuilder()
        .setName('temizle')
        .setDescription('Belirtilen sayıda mesajı kanaldan siler (Yönetici).')
        .addIntegerOption(o => o.setName('sayi').setDescription('Silinecek mesaj sayısı (1-100)').setRequired(true)),
    new SlashCommandBuilder()
        .setName('gönder')
        .setDescription('Bot üzerinden belirtilen kanala mesaj gönderir (Yönetici).')
        .addChannelOption(o => o.setName('kanal').setDescription('Mesajın gideceği kanal').setRequired(true))
        .addStringOption(o => o.setName('mesaj').setDescription('Gönderilecek metin').setRequired(true)),
    new SlashCommandBuilder()
        .setName('embed-gönder')
        .setDescription('Bot üzerinden özel Embed mesajı gönderir (Yönetici).')
        .addChannelOption(o => o.setName('kanal').setDescription('Mesajın gideceği kanal').setRequired(true))
        .addStringOption(o => o.setName('baslik').setDescription('Embed başlığı').setRequired(true))
        .addStringOption(o => o.setName('aciklama').setDescription('Embed açıklaması').setRequired(true))
        .addStringOption(o => o.setName('renk').setDescription('Renk HEX Kodu (örn: #2ecc71)').setRequired(false))
        .addStringOption(o => o.setName('gorsel').setDescription('Görsel URL').setRequired(false))
].map(c => c.toJSON());

// BOT HAZIR
client.once('ready', async () => {
    console.log(`[TÜRKIYECRAFT] ${client.user.tag} başarıyla başlatıldı!`);

    if (CONFIG.TOKEN) {
        try {
            const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);
            await rest.put(Routes.applicationGuildCommands(CONFIG.CLIENT_ID, CONFIG.GUILD_ID), { body: [] });
            await rest.put(Routes.applicationGuildCommands(CONFIG.CLIENT_ID, CONFIG.GUILD_ID), { body: slashCommands });
            console.log('[TÜRKIYECRAFT] Slash komutları sıfırlandı ve güncellendi.');
        } catch (err) {
            console.error('[HATA] Slash komut:', err.message);
        }
    }

    const guild = client.guilds.cache.get(CONFIG.GUILD_ID);
    if (guild) {
        const guildInvites = await guild.invites.fetch().catch(() => new Map());
        guildInvites.forEach(inv => invitesCache.set(inv.code, inv.uses));
    }

    setInterval(updateServerStatus, 5 * 60 * 1000);
    updateServerStatus();
});

// Canlı Durum Kontrolü
async function updateServerStatus() {
    const guild = client.guilds.cache.get(CONFIG.GUILD_ID);
    if (!guild) return;

    let online = 0, max = 0, isUp = false;
    try {
        const res = await util.status(CONFIG.SERVER.IP, CONFIG.SERVER.PORT, { timeout: 3000 });
        online = res.players.online;
        max = res.players.max;
        isUp = true;
    } catch {
        isUp = false;
    }

    client.user.setActivity(isUp ? `${CONFIG.SERVER.IP} (${online}/${max})` : `Bakımda: ${CONFIG.SERVER.IP}`);

    const statusChannel = guild.channels.cache.get(CONFIG.CHANNELS.STATUS);
    if (statusChannel && statusChannel.isTextBased()) {
        const embed = new EmbedBuilder()
            .setColor(isUp ? '#2ecc71' : '#e74c3c')
            .setAuthor({ name: `${CONFIG.SERVER.NAME} • Canlı Ağ Durumu`, iconURL: CONFIG.SERVER.ICON_URL })
            .setThumbnail(CONFIG.SERVER.ICON_URL)
            .setDescription(`Aşağıda **${CONFIG.SERVER.NAME}** sunucusunun anlık bağlantı verileri yer almaktadır.`)
            .addFields(
                { name: '🌐 Sunucu IP', value: `\`${CONFIG.SERVER.IP}\``, inline: true },
                { name: '🟢 Durum', value: isUp ? '`Aktif / Canlı`' : '`Yakında Açılıyor / Bakım`', inline: true },
                { name: '👥 Çevrimiçi', value: `\`${online} / ${max}\``, inline: true },
                { name: '⚡ Sürüm', value: `\`${CONFIG.SERVER.VERSION}\``, inline: false }
            )
            .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
            .setTimestamp();

        const messages = await statusChannel.messages.fetch({ limit: 5 }).catch(() => new Map());
        const lastBotMsg = messages.find(m => m.author.id === client.user.id);
        if (lastBotMsg) {
            await lastBotMsg.edit({ embeds: [embed] }).catch(() => {});
        } else {
            await statusChannel.send({ embeds: [embed] }).catch(() => {});
        }
    }
}

// MESAJ YÖNETİMİ
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (checkSecurityViolations(message)) return;

    const lowMsg = message.content.toLowerCase().trim();
    if (lowMsg === 'sa' || lowMsg === 'sea') {
        return message.reply(`Aleyküm Selam, **${message.author.username}**! ${CONFIG.SERVER.NAME}'a hoş geldin.`);
    } else if (lowMsg === 'ip' || lowMsg === 'ip ne') {
        return message.reply(`🌐 Sunucu IP Adresimiz: **${CONFIG.SERVER.IP}** (Sürüm: ${CONFIG.SERVER.VERSION})`);
    }

    // Seviye Sistemi
    const userId = message.author.id;
    if (!xpData[userId]) xpData[userId] = { xp: 0, level: 1 };
    xpData[userId].xp += Math.floor(Math.random() * 8) + 3;
    const nextLevelXP = xpData[userId].level * 150;
    if (xpData[userId].xp >= nextLevelXP) {
        xpData[userId].level += 1;
        xpData[userId].xp = 0;
        saveXP();
        const curLevel = xpData[userId].level;
        message.channel.send(`🎉 Tebrikler ${message.author}! Seviye atladın: **Seviye ${curLevel}**`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        for (const [key, val] of Object.entries(CONFIG.ROLES.LEVEL_ROLES)) {
            if (curLevel >= val.level && !message.member.roles.cache.has(val.id)) {
                message.member.roles.add(val.id).catch(() => {});
            }
        }
    }

    if (!message.content.startsWith(CONFIG.PREFIX)) return;
    const args = message.content.slice(CONFIG.PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // !ip, !durum
    if (['ip', 'mc', 'durum'].includes(cmd)) {
        try {
            const status = await util.status(CONFIG.SERVER.IP, CONFIG.SERVER.PORT, { timeout: 3000 });
            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setAuthor({ name: `${CONFIG.SERVER.NAME} • Sunucu Durumu`, iconURL: CONFIG.SERVER.ICON_URL })
                .setThumbnail(CONFIG.SERVER.ICON_URL)
                .setDescription(`Sunucu aktif ve erişilebilir durumda!`)
                .addFields(
                    { name: '🌐 IP', value: `\`${CONFIG.SERVER.IP}\``, inline: true },
                    { name: '👥 Çevrimiçi', value: `\`${status.players.online} / ${status.players.max}\``, inline: true },
                    { name: '⚡ Sürüm', value: `\`${CONFIG.SERVER.VERSION}\``, inline: false }
                )
                .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        } catch {
            return message.reply(`🔴 Sunucu şu anda kapalı veya bakımda! IP: \`${CONFIG.SERVER.IP}\``);
        }
    }

    // !yardım
    if (cmd === 'yardım') {
        const isStaff = message.member.roles.cache.has(CONFIG.ROLES.YETKILI_EKIBI) || hasAdminPower(message.member);
        if (!isStaff) return message.reply('❌ Bu komutu sadece yetkili ekibi görüntüleyebilir.');

        const helpEmbed = new EmbedBuilder()
            .setColor('#3498db')
            .setAuthor({ name: `${CONFIG.SERVER.NAME} • Yetkili Komut Rehberi`, iconURL: CONFIG.SERVER.ICON_URL })
            .setDescription(`Sunucu içerisinde kullanabileceğiniz yetkili araçları ve komut listesi:`)
            .addFields(
                { name: '⚙️ Yönetici Komutları', value: '`/temizle` - Kanaldaki mesajları siler.\n`/gönder` - Kanala mesaj yollar.\n`/embed-gönder` - Kanala özel embed gönderir.\n`!paneller-kur` - Tüm sistem panellerini kurar.\n`!owner` - Sistem durum raporunu verir.' },
                { name: '💬 Slash Komutları', value: '`/duyuru` - Kanala resmi duyuru atar.\n`/yanıt` - Talebe hazır kalıp iletir.\n`/çekiliş` - Çekiliş başlatır.\n`/kont-panel` - Hile kontrol kaydı girer.\n`/incele` - Oyuncu profili inceler.' },
                { name: '🔒 Özel Komutlar', value: '`!stop`, `!reload` - Yalnızca Bot Sahibi tarafından kullanılabilir.' }
            )
            .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL });
        return message.reply({ embeds: [helpEmbed] });
    }

    // !owner
    if (cmd === 'owner') {
        if (!hasAdminPower(message.member)) return message.reply('❌ Bu rapora yalnızca Yöneticiler erişebilir.');

        const ramUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const uptimeHours = Math.floor(process.uptime() / 3600);
        const uptimeMinutes = Math.floor((process.uptime() % 3600) / 60);

        let mcStatus = 'Kapalı / Erişilemez';
        try {
            const mc = await util.status(CONFIG.SERVER.IP, CONFIG.SERVER.PORT, { timeout: 2000 });
            mcStatus = `Aktif (${mc.players.online}/${mc.players.max})`;
        } catch {}

        const ownerEmbed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setAuthor({ name: `${CONFIG.SERVER.NAME} • Sistem Sağlık Raporu`, iconURL: CONFIG.SERVER.ICON_URL })
            .setThumbnail(CONFIG.SERVER.ICON_URL)
            .addFields(
                { name: '🤖 Bot Bellek (RAM)', value: `\`${ramUsage} MB\``, inline: true },
                { name: '⚡ Discord Gecikmesi', value: `\`${client.ws.ping} ms\``, inline: true },
                { name: '⏱️ Çalışma Süresi', value: `\`${uptimeHours} saat ${uptimeMinutes} dk\``, inline: true },
                { name: '🎮 Minecraft Sunucusu', value: `\`${mcStatus}\``, inline: true },
                { name: '👥 Sunucu Üye Sayısı', value: `\`${message.guild.memberCount}\``, inline: true },
                { name: '📁 Node Sürümü', value: `\`${process.version}\``, inline: true }
            )
            .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
            .setTimestamp();
        return message.reply({ embeds: [ownerEmbed] });
    }

    // !stop, !start, !reload (Sadece OWNER_ID)
    if (['stop', 'start', 'reload'].includes(cmd)) {
        if (message.author.id !== CONFIG.OWNER_ID) {
            return message.reply('❌ Bu komutu sadece Bot Sahibi kullanabilir.');
        }

        const logCh = message.guild.channels.cache.get(CONFIG.CHANNELS.LOG_PUNISH);
        if (logCh) {
            logCh.send(`⚠️ **[SİSTEM BİLGİSİ]** Bot işlemi tetiklendi: \`!${cmd}\` (İşlemi Yapan: ${message.author.tag})`).catch(() => {});
        }

        if (cmd === 'stop') {
            await message.reply('🛑 Bot kapatılıyor...');
            process.exit(0);
        } else if (cmd === 'reload' || cmd === 'start') {
            await message.reply('🔄 Bot servisleri yeniden başlatılıyor...');
            process.exit(1);
        }
    }

    // !paneller-kur
    if (cmd === 'paneller-kur') {
        if (!hasAdminPower(message.member)) return message.reply('❌ Bu işlem için Yönetici yetkisi gereklidir.');
        buildAllPanels(message.guild);
        return message.reply('✅ Bütün sistem panelleri başarıyla yüklendi.');
    }
});

// LOGLAR: SİLİNEN & DÜZENLENEN
client.on('messageDelete', async (message) => {
    if (!message.guild || message.author?.bot) return;
    const logChannel = message.guild.channels.cache.get(CONFIG.CHANNELS.LOG_MESSAGES);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setAuthor({ name: '🗑️ Mesaj Silindi', iconURL: CONFIG.SERVER.ICON_URL })
        .setDescription(`**Yazar:** ${message.author} (\`${message.author.id}\`)\n**Kanal:** ${message.channel}\n\n**Silinen İçerik:**\n> ${message.content || 'Görsel / Dosya'}`)
        .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
        .setTimestamp();
    logChannel.send({ embeds: [embed] }).catch(() => {});
});

client.on('messageUpdate', async (oldMsg, newMsg) => {
    if (!oldMsg.guild || oldMsg.author?.bot || oldMsg.content === newMsg.content) return;
    const logChannel = oldMsg.guild.channels.cache.get(CONFIG.CHANNELS.LOG_MESSAGES);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setAuthor({ name: '✏️ Mesaj Düzenlendi', iconURL: CONFIG.SERVER.ICON_URL })
        .setDescription(`**Yazar:** ${oldMsg.author} (\`${oldMsg.author.id}\`)\n**Kanal:** ${oldMsg.channel}`)
        .addFields(
            { name: 'Eski Hali', value: `> ${oldMsg.content || 'Boş'}`, inline: false },
            { name: 'Yeni Hali', value: `> ${newMsg.content || 'Boş'}`, inline: false }
        )
        .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
        .setTimestamp();
    logChannel.send({ embeds: [embed] }).catch(() => {});
});

// HOŞ GELDİN
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
        .setThumbnail(CONFIG.SERVER.ICON_URL)
        .setDescription(`Selam ${member}! Sunucumuzun büyüyen bir parçası olduğun için mutluyuz.\n\n` +
            `📜 Kurallarımızı <#${CONFIG.CHANNELS.RULES}> kanalından okumayı unutma!\n` +
            `🔗 Minecraft Adresimiz: \`${CONFIG.SERVER.IP}\`\n\n` +
            `🎯 **Geliş Yolu:** \`${inviterText}\``
        )
        .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
        .setTimestamp();

    welcomeChannel.send({ content: `👋 Merhaba ${member}!`, embeds: [embed] }).catch(() => {});
});

// ETKİLEŞİMLER
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const { commandName, member, options, channel } = interaction;

        // /temizle
        if (commandName === 'temizle') {
            if (!hasAdminPower(member)) return interaction.reply({ content: '❌ Bu komutu sadece Yöneticiler kullanabilir.', ephemeral: true });

            const count = options.getInteger('sayi');
            if (count < 1 || count > 100) return interaction.reply({ content: 'Lütfen 1 ile 100 arasında bir sayı giriniz.', ephemeral: true });

            await channel.bulkDelete(count, true).catch(() => {});
            return interaction.reply({ content: `🧹 Başarıyla **${count}** adet mesaj temizlendi.`, ephemeral: true });
        }

        // /gönder
        if (commandName === 'gönder') {
            if (!hasAdminPower(member)) return interaction.reply({ content: '❌ Bu komutu sadece Yöneticiler kullanabilir.', ephemeral: true });

            const targetChannel = options.getChannel('kanal');
            const text = options.getString('mesaj');

            if (!targetChannel.isTextBased()) return interaction.reply({ content: 'Lütfen geçerli bir metin kanalı seçin.', ephemeral: true });

            await targetChannel.send(text);
            return interaction.reply({ content: `✅ Mesaj başarıyla ${targetChannel} kanalına gönderildi.`, ephemeral: true });
        }

        // /embed-gönder
        if (commandName === 'embed-gönder') {
            if (!hasAdminPower(member)) return interaction.reply({ content: '❌ Bu komutu sadece Yöneticiler kullanabilir.', ephemeral: true });

            const targetChannel = options.getChannel('kanal');
            const baslik = options.getString('baslik');
            const aciklama = options.getString('aciklama');
            const renk = options.getString('renk') || '#2ecc71';
            const gorsel = options.getString('gorsel');

            if (!targetChannel.isTextBased()) return interaction.reply({ content: 'Lütfen geçerli bir metin kanalı seçin.', ephemeral: true });

            const customEmbed = new EmbedBuilder()
                .setColor(renk)
                .setTitle(baslik)
                .setDescription(aciklama)
                .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
                .setTimestamp();

            if (gorsel) customEmbed.setImage(gorsel);

            await targetChannel.send({ embeds: [customEmbed] });
            return interaction.reply({ content: `✅ Embed başarıyla ${targetChannel} kanalına gönderildi.`, ephemeral: true });
        }

        // /yanıt
        if (commandName === 'yanıt') {
            const isStaff = member.roles.cache.has(CONFIG.ROLES.YETKILI_EKIBI) || member.roles.cache.has(CONFIG.ROLES.GOREVLI_GENEL) || hasAdminPower(member);
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
        if (commandName === 'duyuru') {
            if (!hasAdminPower(member)) return interaction.reply({ content: 'Yetkiniz yetersiz.', ephemeral: true });

            const targetChannel = options.getChannel('kanal');
            const baslik = options.getString('baslik');
            const icerik = options.getString('icerik');
            const gorsel = options.getString('gorsel');

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
        if (commandName === 'çekiliş') {
            const odul = options.getString('odul');
            const kazanan = options.getInteger('kazanan');
            const sure = options.getInteger('sure');
            const bitisZamani = Math.floor((Date.now() + (sure * 60 * 1000)) / 1000);

            const embed = new EmbedBuilder()
                .setColor('#f1c40f')
                .setAuthor({ name: '🎉 ÇEKİLİŞ BAŞLADI 🎉', iconURL: CONFIG.SERVER.ICON_URL })
                .setTitle(odul)
                .setDescription(`Aşağıdaki butona basarak çekilişe katılabilirsiniz!\n\n` +
                    `👑 **Kazanan Sayısı:** \`${kazanan}\`\n` +
                    `⏰ **Bitiş:** <t:${bitisZamani}:R>`
                )
                .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`giveaway_join_${Date.now()}`).setLabel('Katıl (0)').setStyle(ButtonStyle.Success).setEmoji('🎉')
            );
            return interaction.reply({ embeds: [embed], components: [row] });
        }

        // /kont-panel
        if (commandName === 'kont-panel') {
            const isStaff = member.roles.cache.has(CONFIG.ROLES.YETKILI_EKIBI) || hasAdminPower(member);
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
        if (commandName === 'incele') {
            const user = options.getUser('kullanici');
            const userLvl = xpData[user.id] || { level: 1, xp: 0 };
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setAuthor({ name: `${user.username} Profil İncelemesi`, iconURL: user.displayAvatarURL() })
                .addFields(
                    { name: 'Kullanıcı ID', value: `\`${user.id}\``, inline: true },
                    { name: 'Topluluk Seviyesi', value: `\`Seviye ${userLvl.level} (${userLvl.xp} XP)\``, inline: true },
                    { name: 'Hesap Oluşturulma', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: false }
                )
                .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }

    // MENÜLER
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'select_quick_reply') {
            const val = interaction.values[0];
            let title = "", desc = "", color = "#2ecc71";
            if (val === 'cozuldu') {
                title = "✅ Destek Talebi Çözüldü";
                desc = "Talebiniz kapsamında gerekli kontroller tamamlandı.\nSorununuz çözüldüyse talep kapatılabilir.";
            } else if (val === 'kanit') {
                title = "📷 Kanıt ve Bilgi Talebi";
                desc = "Durumu doğrulayabilmemiz adına ekran görüntüsü veya video kaydı iletmenizi rica ederiz.";
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
                .setFooter({ text: `Bu yanıt @${interaction.user.username} tarafından iletilmiştir. • ${CONFIG.SERVER.FOOTER}`, iconURL: CONFIG.SERVER.ICON_URL });

            await interaction.channel.send({ embeds: [replyEmbed] });
            return interaction.update({ content: 'Hazır yanıt kanala gönderildi.', components: [] });
        }

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

    // BUTONLAR
    if (interaction.isButton()) {
        const { customId, guild, member, user, channel } = interaction;

        if (customId === 'btn_boost_check') {
            await interaction.deferReply({ ephemeral: true });
            const isBooster = member.roles.cache.has(CONFIG.ROLES.BOOSTER);
            return interaction.editReply({
                content: isBooster ? '💎 Sunucumuza takviye basmış durumdasınız, desteğiniz için teşekkür ederiz!' : '❌ Şu an aktif bir takviyeniz bulunmuyor.'
            });
        }

        if (customId === 'btn_ticket_claim') {
            const isStaff = member.roles.cache.has(CONFIG.ROLES.YETKILI_EKIBI) || member.roles.cache.has(CONFIG.ROLES.GOREVLI_GENEL) || hasAdminPower(member);
            if (!isStaff) return interaction.reply({ content: 'Bu butonu sadece yetkililer kullanabilir.', ephemeral: true });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claimed_btn').setLabel(`${user.username} İlgileniyor`).setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('btn_ticket_close').setLabel('Talebi Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );
            await interaction.update({ components: [row] });

            const claimEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setAuthor({ name: '🛡️ Destek Talebi Üstlenildi', iconURL: user.displayAvatarURL() })
                .setDescription(`Bu destek talebi **${user}** tarafından devralınmıştır.\nEn kısa süre içerisinde sizlere yardımcı olunacaktır.`)
                .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
                .setTimestamp();

            return channel.send({ embeds: [claimEmbed] });
        }

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
                            .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL });
                        await logChannel.send({ embeds: [embed], files: [file] });
                    }
                    await channel.delete();
                } catch (e) {
                    console.error(e);
                }
            }, 3000);
        }

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

        if (customId.startsWith('app_accept_') || customId.startsWith('app_reject_')) {
            if (!hasAdminPower(member)) return interaction.reply({ content: 'Yetkiniz yetersiz.', ephemeral: true });

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

    // MODAL FORMLARI
    if (interaction.isModalSubmit()) {
        const { customId, fields, user, guild } = interaction;

        if (customId.startsWith('modal_ticket_open_')) {
            const category = customId.replace('modal_ticket_open_', '');
            const ign = fields.getTextInputValue('t_ign');
            const issue = fields.getTextInputValue('t_issue');

            const cleanUserName = user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
            const channelName = `${category}-${cleanUserName}`;

            const ch = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: CONFIG.CHANNELS.TICKET_CATEGORY || null,
                permissionOverwrites: [
                    { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
                    { id: CONFIG.ROLES.GOREVLI_GENEL, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    { id: CONFIG.ROLES.YONETICI, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] }
                ]
            });

            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setAuthor({ name: `Destek Talebi #${Math.floor(1000 + Math.random() * 9000)}`, iconURL: CONFIG.SERVER.ICON_URL })
                .setThumbnail(CONFIG.SERVER.ICON_URL)
                .setDescription(`Sayın ${user}, destek talebiniz başarıyla açıldı. Yetkililerimiz ilgilenecektir.`)
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

        if (customId === 'modal_suggestion') {
            const text = fields.getTextInputValue('s_text');
            const targetChannel = guild.channels.cache.get(CONFIG.CHANNELS.ONERI_LISTE);
            if (targetChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#f1c40f')
                    .setAuthor({ name: `${user.username} Tarafından Yeni Öneri`, iconURL: user.displayAvatarURL() })
                    .setDescription(`> ${text}`)
                    .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
                    .setTimestamp();
                const msg = await targetChannel.send({ embeds: [embed] });
                await msg.react('🟢');
                await msg.react('🔴');
            }
            return interaction.reply({ content: '✅ Öneriniz oylama kanalına aktarıldı.', ephemeral: true });
        }

        if (customId === 'modal_bug') {
            const text = fields.getTextInputValue('b_text');
            const targetChannel = guild.channels.cache.get(CONFIG.CHANNELS.HATA_LISTE);
            if (targetChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#e67e22')
                    .setAuthor({ name: `Hata Bildirimi • ${user.username}`, iconURL: user.displayAvatarURL() })
                    .setDescription(`> ${text}`)
                    .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
                    .setTimestamp();
                const msg = await targetChannel.send({ embeds: [embed] });
                await msg.react('✅');
                await msg.react('❌');
            }
            return interaction.reply({ content: '✅ Hata bildiriminiz yetkililere iletildi.', ephemeral: true });
        }

        if (customId === 'modal_staff_app') {
            const nameAge = fields.getTextInputValue('app_name_age');
            const exp = fields.getTextInputValue('app_exp');
            const q1 = fields.getTextInputValue('app_q1');
            const q2 = fields.getTextInputValue('app_q2');
            const q3 = fields.getTextInputValue('app_q3');

            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setAuthor({ name: `${CONFIG.SERVER.NAME} • Başvuru Değerlendirme`, iconURL: CONFIG.SERVER.ICON_URL })
                .setTitle(`Yetkili Başvurusu: ${nameAge}`)
                .setDescription(`**Başvuran:** ${user} (${user.id})`)
                .addFields(
                    { name: 'İsim / Yaş', value: nameAge, inline: true },
                    { name: 'Aktiflik Süresi', value: q2, inline: true },
                    { name: 'Deneyimler', value: `> ${exp}`, inline: false },
                    { name: 'Neden Biz?', value: `> ${q1}`, inline: false },
                    { name: 'Hileye Müdahale Planı', value: `> ${q3}`, inline: false }
                )
                .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`app_accept_${user.id}`).setLabel('Onayla').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`app_reject_${user.id}`).setLabel('Reddet').setStyle(ButtonStyle.Danger)
            );

            const thread = await interaction.channel.threads.create({
                name: `başvuru-${user.username}`,
                autoArchiveDuration: 1440,
                type: ChannelType.PrivateThread
            });

            await thread.members.add(user.id);
            await thread.send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: `✅ Başvurunuz alındı. İnceleme odanız: ${thread}`, ephemeral: true });
        }

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
                    .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
                    .setTimestamp();
                await logCh.send({ embeds: [embed] });
            }
            return interaction.reply({ content: '✅ Kontrol kaydı loglandı.', ephemeral: true });
        }
    }
});

// SES ODALARI
client.on('voiceStateUpdate', async (oldState, newState) => {
    if (newState.channelId === CONFIG.CHANNELS.TEMP_VOICE_CREATOR) {
        const guild = newState.guild;
        const member = newState.member;

        const customVoice = await guild.channels.create({
            name: `🔊 | ${member.user.username} Odası`,
            type: ChannelType.GuildVoice,
            parent: CONFIG.CHANNELS.TEMP_VOICE_CATEGORY || null,
            permissionOverwrites: [
                { id: member.id, allow: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.MoveMembers] }
            ]
        });

        await member.voice.setChannel(customVoice);

        const checkInterval = setInterval(async () => {
            const ch = guild.channels.cache.get(customVoice.id);
            if (!ch) {
                clearInterval(checkInterval);
                return;
            }
            if (ch.members.size === 0) {
                await ch.delete().catch(() => {});
                clearInterval(checkInterval);
            }
        }, 5 * 60 * 1000);
    }

    if (oldState.channel && oldState.channel.parentId === CONFIG.CHANNELS.TEMP_VOICE_CATEGORY && oldState.channelId !== CONFIG.CHANNELS.TEMP_VOICE_CREATOR) {
        if (oldState.channel.members.size === 0) {
            oldState.channel.delete().catch(() => {});
        }
    }
});

client.login(CONFIG.TOKEN);
