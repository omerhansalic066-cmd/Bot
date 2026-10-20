const {
    Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder,
    ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder,
    TextInputBuilder, TextInputStyle, ChannelType, PermissionsBitField,
    REST, Routes, SlashCommandBuilder
} = require('discord.js');
const util = require('minecraft-server-util');
const discordTranscripts = require('discord-html-transcripts');
const fs = require('fs');

const CONFIG = require('./config');
const { checkSecurityViolations } = require('./security');
const { buildAllPanels } = require('./panels');

// --- OYUN VE SİSTEM VERİLERİ ---
let xpData = {};
let countingData = { current: 1, lastUser: null, cooldowns: new Map() };
let wordData = { lastWord: "minecraft", lastUser: null };
let giveawayParticipants = new Map(); // interactionId -> Set(userIds)

if (fs.existsSync('./levels.json')) {
    try { xpData = JSON.parse(fs.readFileSync('./levels.json', 'utf8')); } catch { xpData = {}; }
}
function saveXP() { try { fs.writeFileSync('./levels.json', JSON.stringify(xpData, null, 2)); } catch {} }

function hasAdminPower(member) {
    if (!member) return false;
    return member.roles.cache.has(CONFIG.ROLES.YONETICI) || member.permissions.has(PermissionsBitField.Flags.Administrator) || member.id === CONFIG.OWNER_ID;
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildInvites
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

// --- READY EVENT ---
client.once('ready', async () => {
    console.log(`[TÜRKIYECRAFT] ${client.user.tag} operasyona hazır!`);

    // Slash Komut Yükleme
    try {
        const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);
        const slashCommands = [
            new SlashCommandBuilder().setName('yanıt').setDescription('Destek talebine hazır yanıt şablonu.'),
            new SlashCommandBuilder().setName('temizle').setDescription('Mesaj siler.').addIntegerOption(o => o.setName('sayi').setRequired(true).setDescription('1-100')),
            new SlashCommandBuilder().setName('duyuru').setDescription('Duyuru yapar.').addChannelOption(o => o.setName('kanal').setRequired(true)).addStringOption(o => o.setName('baslik').setRequired(true)).addStringOption(o => o.setName('icerik').setRequired(true)),
            new SlashCommandBuilder().setName('çekiliş').setDescription('Çekiliş başlatır.').addStringOption(o => o.setName('odul').setRequired(true)).addIntegerOption(o => o.setName('kazanan').setRequired(true)).addIntegerOption(o => o.setName('sure').setRequired(true)),
            new SlashCommandBuilder().setName('kont-panel').setDescription('Hile kontrol paneli.')
        ].map(c => c.toJSON());
        await rest.put(Routes.applicationGuildCommands(CONFIG.CLIENT_ID, CONFIG.GUILD_ID), { body: slashCommands });
    } catch (e) { console.error(e); }

    // 10 Saniyede Bir Değişen Durum
    let statusIndex = 0;
    setInterval(() => {
        client.user.setActivity(CONFIG.STATUS_MESSAGES[statusIndex], { type: 0 });
        statusIndex = (statusIndex + 1) % CONFIG.STATUS_MESSAGES.length;
    }, 10000);

    setInterval(updateServerStatus, 5 * 60 * 1000);
});

// --- OYUN MOTORLARI ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // 1. SAYI SAYMACA OYUNU
    if (message.channelId === CONFIG.CHANNELS.GAME_COUNTING) {
        const num = parseInt(message.content);
        const now = Date.now();
        const userCooldown = countingData.cooldowns.get(message.author.id) || 0;

        if (isNaN(num) || message.content.includes(" ")) {
            message.delete().catch(() => {});
            return;
        }

        if (now - userCooldown < 30000) {
            message.delete().catch(() => {});
            message.channel.send(`⚠️ ${message.author}, tekrar yazmak için 30 saniye beklemelisin!`).then(m => setTimeout(() => m.delete(), 3000));
            return;
        }

        if (num === countingData.current && message.author.id !== countingData.lastUser) {
            countingData.current++;
            countingData.lastUser = message.author.id;
            countingData.cooldowns.set(message.author.id, now);
            message.react('✅').catch(() => {});
        } else {
            countingData.current = 1;
            countingData.lastUser = null;
            message.channel.send(`❌ ${message.author} hatalı sayı yazdı veya üst üste yazdı! Oyun **1**'den tekrar başlıyor.`);
            message.react('❌').catch(() => {});
        }
        return;
    }

    // 2. KELİME TÜRETMECE OYUNU
    if (message.channelId === CONFIG.CHANNELS.GAME_WORD) {
        const word = message.content.toLowerCase().trim();
        const lastLetter = wordData.lastWord.slice(-1);

        // TDK / Saçmalama Koruması
        const turkishRegex = /^[abcçdefgğhıijklmnoöprsştuüvyz]+$/i;
        if (!turkishRegex.test(word) || word.length < 2 || word.includes(" ")) {
            message.delete().catch(() => {});
            return;
        }

        if (message.author.id === wordData.lastUser) {
            message.delete().catch(() => {});
            message.channel.send(`⚠️ ${message.author}, üst üste kelime yazamazsın!`).then(m => setTimeout(() => m.delete(), 3000));
            return;
        }

        if (word.startsWith(lastLetter)) {
            wordData.lastWord = word;
            wordData.lastUser = message.author.id;
            message.react('📝').catch(() => {});
        } else {
            message.delete().catch(() => {});
            message.channel.send(`⚠️ ${message.author}, kelimen **${lastLetter.toUpperCase()}** harfi ile başlamalı!`).then(m => setTimeout(() => m.delete(), 3000));
        }
        return;
    }

    // GÜVENLİK VE SEVİYE SİSTEMİ
    if (checkSecurityViolations(message)) return;
    
    // Prefix Komutları
    if (!message.content.startsWith(CONFIG.PREFIX)) return;
    const args = message.content.slice(CONFIG.PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // Yetkili Loguna Gidecek Komutlar
    if (['stop', 'reload', 'owner'].includes(cmd)) {
        if (message.author.id !== CONFIG.OWNER_ID && !hasAdminPower(message.member)) return;
        const logCh = message.guild.channels.cache.get(CONFIG.CHANNELS.LOG_KONTROL);
        if (logCh) logCh.send(`⚙️ **Yönetim İşlemi:** \`${cmd}\` | Yapan: ${message.author.tag}`);
        
        if (cmd === 'stop') { await message.reply("🛑 Bot durduruluyor..."); process.exit(0); }
        if (cmd === 'reload') { await message.reply("🔄 Bot yenileniyor..."); process.exit(1); }
        if (cmd === 'owner') { /* Owner Embed kodları buraya */ }
    }
    
    if (cmd === 'paneller-kur' && hasAdminPower(message.member)) buildAllPanels(message.guild);
});

// --- INTERACTION HANDLING (ÇEKİLİŞ DÜZELTME) ---
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        const { customId, user, message } = interaction;

        // Çekiliş Katılım Butonu
        if (customId.startsWith('giveaway_join_')) {
            let participants = giveawayParticipants.get(customId);
            if (!participants) {
                participants = new Set();
                giveawayParticipants.set(customId, participants);
            }

            if (participants.has(user.id)) {
                return interaction.reply({ content: "❌ Zaten bu çekilişe katıldınız!", ephemeral: true });
            }

            participants.add(user.id);
            const currentEmbed = EmbedBuilder.from(message.embeds[0]);
            
            const newRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(customId)
                    .setLabel(`Katıl (${participants.size})`)
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎉')
            );

            await interaction.update({ components: [newRow] });
            return;
        }

        // Takviye Kontrol
        if (customId === 'btn_boost_check') {
            await interaction.deferReply({ ephemeral: true });
            const isBooster = interaction.member.roles.cache.has(CONFIG.ROLES.BOOSTER);
            return interaction.editReply(isBooster ? "💎 Teşekkürler, takviye basmışsınız!" : "❌ Takviye basılmamış.");
        }
    }
    // Diğer Slash ve Modal kodları...
});

async function updateServerStatus() {
    const guild = client.guilds.cache.get(CONFIG.GUILD_ID);
    const statusChannel = guild?.channels.cache.get(CONFIG.CHANNELS.STATUS);
    if (!statusChannel) return;

    try {
        const res = await util.status(CONFIG.SERVER.IP, CONFIG.SERVER.PORT);
        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setAuthor({ name: `${CONFIG.SERVER.NAME} | Canlı Durum`, iconURL: CONFIG.SERVER.ICON_URL })
            .addFields(
                { name: '🌐 Sunucu IP', value: `\`${CONFIG.SERVER.IP}\``, inline: true },
                { name: '👥 Çevrimiçi', value: `\`${res.players.online}/${res.players.max}\``, inline: true }
            )
            .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL });
        
        const msgs = await statusChannel.messages.fetch({ limit: 5 });
        const last = msgs.find(m => m.author.id === client.user.id);
        if (last) last.edit({ embeds: [embed] }); else statusChannel.send({ embeds: [embed] });
    } catch {}
}

client.login(CONFIG.TOKEN);
