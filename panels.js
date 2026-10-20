const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const CONFIG = require('./config');

async function buildAllPanels(guild) {
    // 1. Destek Paneli
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

    // 2. Booster Paneli
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

    // 3. Hesap Eşle Paneli
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

    // 5. Öneri & Hata Panelleri
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

module.exports = { buildAllPanels };
