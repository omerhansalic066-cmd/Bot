const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const CONFIG = require('./config');

async function buildAllPanels(guild) {
    if (!guild) return;

    async function getChannelSafe(channelId) {
        if (!channelId) return null;
        try {
            return guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
        } catch {
            return null;
        }
    }

    // 1. Destek Paneli
    try {
        const ticketChannel = await getChannelSafe(CONFIG.CHANNELS.TICKET_OPEN);
        if (ticketChannel && ticketChannel.isTextBased()) {
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
                    `• Talebiniz yanıtsız kalırsa belirli süre sonra arşivlenir.`
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
            await ticketChannel.send({ embeds: [embed], components: [row] });
        }
    } catch (e) {
        console.error('[PANEL HATA] Destek:', e.message);
    }

    // 2. Booster Paneli
    try {
        const boostChannel = await getChannelSafe(CONFIG.CHANNELS.BOOSTER_PANEL);
        if (boostChannel && boostChannel.isTextBased()) {
            await guild.members.fetch().catch(() => {});
            const boosters = guild.members.cache.filter(m => m.premiumSince);
            const boostList = boosters.size > 0 
                ? boosters.map(b => `💎 ${b.user} - <t:${Math.floor(b.premiumSinceTimestamp / 1000)}:R> beri takviyeci`).slice(0, 8).join('\n')
                : 'Henüz takviye sağlayan bulunmamaktadır.';

            const embed = new EmbedBuilder()
                .setColor('#f47fff')
                .setAuthor({ name: `${CONFIG.SERVER.NAME} Takviye Panosu`, iconURL: CONFIG.SERVER.ICON_URL })
                .setThumbnail(CONFIG.SERVER.ICON_URL)
                .setDescription(
                    `Sunucumuzu takviye ederek destekleyen tüm oyuncularımıza teşekkür ederiz. 💚\n\n` +
                    `🚀 **Toplam Takviye:** \`${guild.premiumSubscriptionCount || 0}\`\n` +
                    `👥 **Takviyeci Sayısı:** \`${boosters.size}\`\n` +
                    `⭐ **Sunucu Seviyesi:** \`Seviye ${guild.premiumTier}\`\n\n` +
                    `✨ **Takviyecilerimiz:**\n${boostList}`
                )
                .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_boost_check').setLabel('Boost Kontrol').setStyle(ButtonStyle.Success).setEmoji('💎')
            );
            await boostChannel.send({ embeds: [embed], components: [row] });
        }
    } catch (e) {
        console.error('[PANEL HATA] Booster:', e.message);
    }

    // 3. Hesap Eşle Paneli
    try {
        const linkChannel = await getChannelSafe(CONFIG.CHANNELS.HESAP_ESLE);
        if (linkChannel && linkChannel.isTextBased()) {
            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setAuthor({ name: `${CONFIG.SERVER.NAME} Hesap Eşleme`, iconURL: CONFIG.SERVER.ICON_URL })
                .setThumbnail(CONFIG.SERVER.ICON_URL)
                .setDescription(
                    `Oyun hesabınızın güvenliğini en üst düzeye çıkarmak için hesabınızı eşleyin!\n\n` +
                    `**Avantajlar:**\n▸ Olası çalınma durumlarında hak sahipliği kanıtı.\n▸ Özel çekiliş ve etkinliklere erişim.\n\n` +
                    `⚠️ *Bu sistem sunucumuz açıldığında aktif duruma getirilecektir.*`
                )
                .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_link_account').setLabel('Hesabını Eşle (Yakında)').setStyle(ButtonStyle.Secondary).setDisabled(true)
            );
            await linkChannel.send({ embeds: [embed], components: [row] });
        }
    } catch (e) {
        console.error('[PANEL HATA] Hesap Eşle:', e.message);
    }

    // 4. Yetkili Başvuru Paneli
    try {
        const staffAppChannel = await getChannelSafe(CONFIG.CHANNELS.BASVURU_FORM);
        if (staffAppChannel && staffAppChannel.isTextBased()) {
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setAuthor({ name: `${CONFIG.SERVER.NAME} Yetkili Alımları`, iconURL: CONFIG.SERVER.ICON_URL })
                .setThumbnail(CONFIG.SERVER.ICON_URL)
                .setDescription(`Ekibimize katılmak ister misiniz? Aşağıdaki butona tıklayarak başvuru formunu doldurabilirsiniz.`)
                .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_staff_apply').setLabel('Başvuru Yap').setStyle(ButtonStyle.Primary).setEmoji('📝')
            );
            await staffAppChannel.send({ embeds: [embed], components: [row] });
        }
    } catch (e) {
        console.error('[PANEL HATA] Başvuru:', e.message);
    }

    // 5. Öneri & Hata Panelleri
    try {
        const oneriChannel = await getChannelSafe(CONFIG.CHANNELS.ONERI_OLUSTUR);
        if (oneriChannel && oneriChannel.isTextBased()) {
            const embed = new EmbedBuilder()
                .setColor('#f1c40f')
                .setAuthor({ name: `${CONFIG.SERVER.NAME} Öneri Merkezi`, iconURL: CONFIG.SERVER.ICON_URL })
                .setDescription(`Fikirlerinizi yetkililere iletmek için butona tıklayınız.`);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_create_suggestion').setLabel('Öneri Bildir').setStyle(ButtonStyle.Success).setEmoji('💡')
            );
            await oneriChannel.send({ embeds: [embed], components: [row] });
        }

        const hataChannel = await getChannelSafe(CONFIG.CHANNELS.HATA_OLUSTUR);
        if (hataChannel && hataChannel.isTextBased()) {
            const embed = new EmbedBuilder()
                .setColor('#e67e22')
                .setAuthor({ name: `${CONFIG.SERVER.NAME} Hata Bildirimi`, iconURL: CONFIG.SERVER.ICON_URL })
                .setDescription(`Bulduğunuz hataları ileterek ödül kazanmak için butona basınız.`);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_create_bug').setLabel('Hata Bildir').setStyle(ButtonStyle.Danger).setEmoji('⚠️')
            );
            await hataChannel.send({ embeds: [embed], components: [row] });
        }
    } catch (e) {
        console.error('[PANEL HATA] Öneri/Hata:', e.message);
    }

    // 6. Kurallar Paneli
    try {
        const ruleChannel = await getChannelSafe(CONFIG.CHANNELS.RULES);
        if (ruleChannel && ruleChannel.isTextBased()) {
            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setAuthor({ name: `${CONFIG.SERVER.NAME} Resmi Sunucu Kuralları`, iconURL: CONFIG.SERVER.ICON_URL })
                .setThumbnail(CONFIG.SERVER.ICON_URL)
                .setDescription(
                    `1. **Saygı ve Düzen:** Topluluk üyelerine hakaret, küfür ve argo kesinlikle yasaktır.\n` +
                    `2. **Hile ve Üçüncü Parti Yazılımlar:** Oyun dengesini bozan makro, client vb. sınırsız uzaklaştırma sebebidir.\n` +
                    `3. **Reklam ve Tanıtım:** Başka Discord sunucusu, site veya YouTube tanıtımı yasaktır.\n` +
                    `4. **Destek Sistemi:** Yetkilileri gereksiz etiketlemeyiniz; taleplerinizi Destek Talebi kanallarından iletiniz.`
                )
                .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL });
            await ruleChannel.send({ embeds: [embed] });
        }
    } catch (e) {
        console.error('[PANEL HATA] Kurallar:', e.message);
    }
}

module.exports = { buildAllPanels };
