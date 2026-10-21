const express = require('express');
const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    ChannelType, 
    PermissionsBitField 
} = require('discord.js');
const { GoogleGenAI } = require('@google/genai');
// Not: Eğer discord-transcripts kullanıyorsan paketini kurduğundan emin ol: npm install discord-transcripts
const discordTranscripts = require('discord-transcripts');
require('dotenv').config();

// --- CONFIG VE YARDIMCI TANIMLAMALAR ---
const CONFIG = {
    TOKEN: process.env.DISCORD_TOKEN,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    SERVER: {
        NAME: 'TürkiyeCraft',
        ICON_URL: 'https://i.imgur.com/example.png', // Sunucu logonun linki
        FOOTER: 'TürkiyeCraft Skyblock & BoxPvP'
    },
    ROLES: {
        YETKILI_EKIBI: process.env.ROLE_YETKILI || 'ROL_ID_BURAYA',
    },
    CHANNELS: {
        LOG_MESSAGES: process.env.LOG_MESSAGES || 'KANAL_ID_BURAYA',
        LOG_KONTROL: process.env.LOG_KONTROL || 'KANAL_ID_BURAYA'
    },
    CATEGORIES: {
        TICKET: process.env.TICKET_CAT || 'KATEGORI_ID_BURAYA'
    }
};

// Yetki kontrol fonksiyonu örneği
function hasAdminPower(member) {
    return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

// Çekiliş katılımcılarını tutmak için Map
const giveawayParticipants = new Map();

// 1. Express Sunucusu (7/24 aktif kalması ve panel pingleri için)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('TurkiyeCraft Bot aktif ve 7/24 çalışıyor!');
});

app.listen(PORT, () => {
    console.log(`Web sunucusu ${PORT} portunda dinlemede.`);
});

// 2. Google Gemini AI Yapılandırması (v2.30.0)
const ai = new GoogleGenAI({ apiKey: CONFIG.GEMINI_API_KEY });

// 3. Discord Client Tanımlaması
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.once('ready', () => {
    console.log(`Bot başarıyla giriş yaptı: ${client.user.tag}`);
    client.user.setActivity('TürkiyeCraft Skyblock & BoxPvP', { type: 3 });
});

// 4. Etkileşimler ve Buton / Modal Yönetimi
client.on('interactionCreate', async interaction => {
    
    // --- BUTONLAR ---
    if (interaction.isButton()) {
        const { customId, guild, member, channel } = interaction;

        // Çekiliş Katılım Butonu
        if (customId.startsWith('giveaway_join_')) {
            if (!giveawayParticipants.has(customId)) {
                giveawayParticipants.set(customId, new Set());
            }
            const participants = giveawayParticipants.get(customId);

            if (participants.has(member.id)) {
                participants.delete(member.id);
                const newRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(customId).setLabel(`Katıl (${participants.size})`).setStyle(ButtonStyle.Success).setEmoji('🎉')
                );
                await interaction.update({ components: [newRow] }).catch(() => {});
                return interaction.followUp({ content: '❌ Çekilişten başarıyla ayrıldın.', ephemeral: true });
            } else {
                participants.add(member.id);
                const newRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(customId).setLabel(`Katıl (${participants.size})`).setStyle(ButtonStyle.Success).setEmoji('🎉')
                );
                await interaction.update({ components: [newRow] }).catch(() => {});
                return interaction.followUp({ content: '🎉 Çekilişe başarıyla katıldın!', ephemeral: true });
            }
        }

        // Destek Talebi Oluşturma Butonu
        if (customId === 'btn_open_ticket') {
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('menu_ticket_category')
                    .setPlaceholder('📂 Lütfen talep kategorisi seçiniz...')
                    .addOptions([
                        { label: 'Destek / Soru', value: 'destek', emoji: '🎫', description: 'Genel sunucu ve oyun desteği.' },
                        { label: 'Şikayet / Rapor', value: 'sikayet', emoji: '⚠️', description: 'Kural ihlali veya oyuncu şikayeti.' },
                        { label: 'Yetkili Başvurusu', value: 'basvuru', emoji: '🤝', description: 'Ekibimize katılmak için başvuru.' }
                    ])
            );
            return interaction.reply({ content: 'Lütfen açmak istediğiniz talep türünü seçin:', components: [row], ephemeral: true });
        }

        // Talep Kapatma Butonu
        if (customId === 'btn_close_ticket') {
            const isStaff = member.roles.cache.has(CONFIG.ROLES.YETKILI_EKIBI) || hasAdminPower(member);
            if (!isStaff) return interaction.reply({ content: '❌ Bu talebi sadece yetkililer kapatabilir.', ephemeral: true });

            await interaction.reply({ content: '🔒 Talep kapatılıyor, transcript alınıyor...' });
            
            try {
                const attachment = await discordTranscripts.createTranscript(channel, {
                    limit: -1,
                    returnType: 'attachment',
                    filename: `transcript-${channel.name}.html`,
                    save: true,
                    poweredBy: false
                });

                const logChannel = guild.channels.cache.get(CONFIG.CHANNELS.LOG_MESSAGES);
                if (logChannel) {
                    await logChannel.send({
                        content: `📁 **${channel.name}** adlı talep kapatıldı. Transkript aşağıdadır:`,
                        files: [attachment]
                    });
                }
            } catch (err) {
                console.error('[HATA] Transcript alınamadı:', err);
            }

            setTimeout(() => {
                channel.delete().catch(() => {});
            }, 3000);
        }
    }

    // --- MODAL GÖNDERİMLERİ ---
    if (interaction.isModalSubmit()) {
        const { customId, member, fields, guild } = interaction;

        // Hile Kontrol Modal
        if (customId === 'modal_kont_entry') {
            const ign = fields.getTextInputValue('kont_ign');
            const durum = fields.getTextInputValue('kont_durum');
            const hack = fields.getTextInputValue('kont_hack') || 'Belirtilmedi';
            const kanit = fields.getTextInputValue('kont_kanit') || 'Yok';

            const logCh = guild.channels.cache.get(CONFIG.CHANNELS.LOG_KONTROL);
            if (logCh) {
                const embed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setAuthor({ name: `${CONFIG.SERVER.NAME} • Hile Kontrol Kaydı`, iconURL: CONFIG.SERVER.ICON_URL })
                    .addFields(
                        { name: '👤 Kontrol Edilen Oyuncu', value: `\`${ign}\``, inline: true },
                        { name: '🛡️ Kontrol Eden Yetkili', value: `${member} (\`${member.id}\`)`, inline: true },
                        { name: '📊 Durum', value: `\`${durum}\``, inline: true },
                        { name: '⚡ Tespit Edilen', value: `\`${hack}\``, inline: false },
                        { name: '🔗 Kanıt', value: `${kanit}`, inline: false }
                    )
                    .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
                    .setTimestamp();

                await logCh.send({ embeds: [embed] }).catch(() => {});
            }
            return interaction.reply({ content: '✅ Hile kontrol kaydı başarıyla log kanalına iletildi.', ephemeral: true });
        }

        // Destek Talebi Açma Modal
        if (customId.startsWith('modal_ticket_open_')) {
            const cat = customId.replace('modal_ticket_open_', '');
            const ign = fields.getTextInputValue('t_ign');
            const issue = fields.getTextInputValue('t_issue');

            const ticketChannelName = `talep-${member.user.username}`.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            try {
                const ticketChannel = await guild.channels.create({
                    name: ticketChannelName,
                    type: ChannelType.GuildText,
                    parent: CONFIG.CATEGORIES.TICKET || null,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                        { id: CONFIG.ROLES.YETKILI_EKIBI, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
                    ]
                });

                const ticketEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setAuthor({ name: `${CONFIG.SERVER.NAME} • Destek Talebi`, iconURL: CONFIG.SERVER.ICON_URL })
                    .setDescription(`Merhaba ${member}, talebiniz başarıyla oluşturuldu. Yetkili ekibimiz en kısa sürede sizinle ilgilenecektir.`)
                    .addFields(
                        { name: '📂 Kategori', value: `\`${cat.toUpperCase()}\``, inline: true },
                        { name: '🎮 Minecraft Nick', value: `\`${ign}\``, inline: true },
                        { name: '📝 Sorun / Açıklama', value: `> ${issue}`, inline: false }
                    )
                    .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
                    .setTimestamp();

                const closeRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('btn_close_ticket').setLabel('Talebi Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );

                await ticketChannel.send({ content: `${member} | <@&${CONFIG.ROLES.YETKILI_EKIBI}>`, embeds: [ticketEmbed], components: [closeRow] });
                return interaction.reply({ content: `✅ Talebiniz başarıyla açıldı: ${ticketChannel}`, ephemeral: true });
            } catch (err) {
                console.error('[HATA] Talep kanalı oluşturulamadı:', err);
                return interaction.reply({ content: '❌ Talep kanalı oluşturulurken bir hata oluştu.', ephemeral: true });
            }
        }
    }
});

// 5. Botu Başlat
client.login(CONFIG.TOKEN);
