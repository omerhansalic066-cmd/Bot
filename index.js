const { 
    Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, ModalBuilder, 
    TextInputBuilder, TextInputStyle, AuditLogEvent 
} = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildModeration
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember, Partials.Reaction]
});

// --- VERİTABANI / BELLEK ---
const userCredits = new Map(); 
const tempChannels = new Map(); 

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
    geciciKategori: "1542194376032129125",
    hosgeldinKanal: "1542141049118527568"
};

const OWNERS = ["1430625826902114396", "1452002283389849690", "1429198833832951808"];

client.once('ready', async () => {
    console.log(`🤖 ${client.user.tag} başarıyla aktif edildi!`);
    
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
        { name: 'günlüködül', description: 'Günlük rastgele kredi toplarsın' },
        { 
            name: 'çekiliş-yap', 
            description: 'Çekiliş başlatır (Kurucu)', 
            options: [
                { name: 'sure', type: 4, description: 'Süre (Dakika)', required: true },
                { name: 'kazanan_sayisi', type: 4, description: 'Kazanan sayısı', required: true },
                { name: 'odul', type: 3, description: 'Çekiliş Ödülü', required: true }
            ] 
        }
    ];

    try {
        await client.application.commands.set(commands);
        console.log("⚡ Slash komutları başarıyla senkronize edildi!");
    } catch (error) {
        console.error("Slash komutları yüklenirken hata oluştu:", error);
    }
});

// --- WELCOME (HOŞ GELDİN & OTO ROL) ---
client.on('guildMemberAdd', async member => {
    try {
        if (ROLES.onayli) {
            await member.roles.add(ROLES.onayli);
        }
    } catch (err) {
        console.error("Otomatik rol verilirken hata:", err);
    }

    const welcomeChannel = member.guild.channels.cache.get(CHANNELS.hosgeldinKanal);
    if (welcomeChannel) {
        const embed = new EmbedBuilder()
            .setTitle(`🎉 TürkiyeCraft'a Hoş Geldin ${member.user.username}!`)
            .setDescription(`Aramıza katıldığın için çok mutluyuz! Sunucuda keyifli vakit geçirmeni dileriz.\n\n📜 Kuralları okumayı unutma: <#${CHANNELS.kurallar}>\n💬 Toplam Üye Sayımız: **${member.guild.memberCount}**`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setColor("Green")
            .setFooter({ text: FOOTER_TEXT });

        welcomeChannel.send({ content: `Hey ${member}, sunucumuza hoş geldin! 👋`, embeds: [embed] }).catch(() => {});
    }
});

// --- ANTI-BOT KORUMASI ---
client.on('guildMemberAdd', async member => {
    if (!member.user.bot) return;

    try {
        const fetchedLogs = await member.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.BotAdd,
        });
        const botLog = fetchedLogs.entries.first();

        if (botLog) {
            const { executor } = botLog;
            if (!OWNERS.includes(executor.id)) {
                await member.kick("İzinsiz Bot Ekleme Koruması");
                console.log(`🛡️ Bot Koruması: ${member.user.tag} izinsiz eklendiği için atıldı!`);
            }
        } else {
            await member.kick("İzinsiz Bot Koruması");
        }
    } catch (err) {
        console.error("Anti-Bot hatası:", err);
    }
});

// --- ANTICHAT / MODERASYON & OTO YANITLAR ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    if (OWNERS.includes(message.author.id)) return;

    const content = message.content.toLowerCase();

    const engelliKelimeler = ["discord.gg/", "http://", "https://", "www.", ".com", ".net", ".org", "küfür1", "küfür2"];
    if (engelliKelimeler.some(k => content.includes(k))) {
        message.delete().catch(() => {});
        return message.channel.send(`⚠️ ${message.author}, bu sunucuda reklam, link veya küfür yasaktır!`)
            .then(msg => setTimeout(() => msg.delete().catch(() => {}), 4000));
    }

    if (message.content.length > 8) {
        const uppercaseCount = message.content.replace(/[^A-ZÇĞİÖŞÜ]/g, "").length;
        if ((uppercaseCount / message.content.length) > 0.7) {
            message.delete().catch(() => {});
            return message.channel.send(`⚠️ ${message.author}, lütfen büyük harf kullanımına dikkat et!`)
                .then(msg => setTimeout(() => msg.delete().catch(() => {}), 4000));
        }
    }

    if (content === "sa" || content === "selam" || content === "selamın aleyküm") {
        message.reply("Aleykümselam, hoş geldin TürkiyeCraft oyuncusu!");
    } else if (content.includes("iyi akşamlar")) {
        message.reply("Sana da iyi akşamlar! Keyifli oyunlar dileriz.");
    } else if (content.includes("günaydın")) {
        message.reply("Günaydın! Bugün TürkiyeCraft'ta maceraya hazır mısın?");
    } else if (content.includes("tünaydın")) {
        message.reply("Tünaydın! Oyun keyfin bol olsun.");
    } else if (content.includes("nasılsın") && message.mentions.has(client.user)) {
        message.reply("Ben TürkiyeCraft yapay zeka asistanıyım, gayet iyiyim! Sen nasılsın?");
    }
});

// --- GEÇİCİ SES ODA SİSTEMİ (JTC) ---
client.on('voiceStateUpdate', async (oldState, newState) => {
    if (newState.channelId === CHANNELS.geciciKurma) {
        const guild = newState.guild;
        const member = newState.member;

        try {
            const channel = await guild.channels.create({
                name: `🔊 ${member.user.username}'in Odası`,
                type: ChannelType.GuildVoice,
                parent: CHANNELS.geciciKategori || null,
                permissionOverwrites: [
                    { id: guild.id, allow: [PermissionFlagsBits.Connect] },
                    { id: member.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers, PermissionFlagsBits.MoveMembers] }
                ]
            });

            await member.voice.setChannel(channel);
            tempChannels.set(channel.id, { owner: member.id, lastEmpty: Date.now() });
        } catch (err) {
            console.error("JTC Hatası:", err);
        }
    }
});

setInterval(() => {
    tempChannels.forEach(async (data, channelId) => {
        const channel = client.channels.cache.get(channelId);
        if (channel) {
            if (channel.members.size === 0) {
                if (Date.now() - data.lastEmpty > 180000) {
                    await channel.delete().catch(() => {});
                    tempChannels.delete(channelId);
                }
            } else {
                data.lastEmpty = Date.now();
            }
        } else {
            tempChannels.delete(channelId);
        }
    });
}, 10000);

// --- ETKİLEŞİMLER ---
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        if (commandName === 'yardım') {
            const embed = new EmbedBuilder()
                .setTitle(`${SERVER_NAME} - Yardım Menüsü`)
                .setDescription("TürkiyeCraft Discord botu komut listesi aşağıdadır.")
                .addFields(
                    { name: '/yardım', value: 'Yardım menüsünü gösterir.' },
                    { name: '/günlüködül', value: 'Her gün rastgele kredi kazanırsınız.' },
                    { name: '/zar /yazıtura', value: 'Şans oyunları oynarsınız.' },
                    { name: '/temizle', value: 'Mesaj silersiniz (Yetkili).' },
                    { name: '/ticket-son', value: 'Aktif talebi kapatır.' },
                    { name: '/çekiliş-yap', value: 'Hızlı çekiliş başlatır (Kurucu).' }
                )
                .setColor("Gold")
                .setThumbnail(LOGO_URL)
                .setFooter({ text: FOOTER_TEXT });
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (commandName === 'günlüködül') {
            const userId = interaction.user.id;
            const kazanc = Math.floor(Math.random() * 20) + 10;
            let mevcut = userCredits.get(userId) || 0;
            userCredits.set(userId, mevcut + kazanc);
            await interaction.reply({ content: `🎁 Günlük ödülünü aldın! **${kazanc} Kredi** eklendi. Toplam: **${mevcut + kazanc}**`, ephemeral: true });
        }

        if (commandName === 'temizle') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: "Yetkin yok!", ephemeral: true });
            const sayi = interaction.options.getInteger('sayi');
            await interaction.channel.bulkDelete(sayi, true).catch(() => {});
            await interaction.reply({ content: `🧹 **${sayi}** adet mesaj silindi.`, ephemeral: true });
        }

        if (commandName === 'krediekle') {
            if (!OWNERS.includes(interaction.user.id)) return interaction.reply({ content: "Yetkin yok!", ephemeral: true });
            const user = interaction.options.getUser('kullanici');
            const miktar = interaction.options.getInteger('miktar');
            let mevcut = userCredits.get(user.id) || 0;
            userCredits.set(user.id, mevcut + miktar);
            await interaction.reply({ content: `💳 ${user.tag} adlı kullanıcıya **${miktar}** kredi eklendi!` });
        }

        if (commandName === 'zar') {
            const sonuc = Math.floor(Math.random() * 6) + 1;
            await interaction.reply(`🎲 Attığın Zar: **${sonuc}**`);
        }

        if (commandName === 'yazıtura') {
            const sonuc = Math.random() < 0.5 ? "Yazı 🪙" : "Tura 🦅";
            await interaction.reply(`🎯 Sonuç: **${sonuc}**`);
        }

        if (commandName === 'çekiliş-yap') {
            if (!OWNERS.includes(interaction.user.id)) return interaction.reply({ content: "Yetkin yok!", ephemeral: true });

            const sure = interaction.options.getInteger('sure');
            const kazananSayisi = interaction.options.getInteger('kazanan_sayisi');
            const odul = interaction.options.getString('odul');
            const bitisZamani = Math.floor((Date.now() + sure * 60000) / 1000);

            const embed = new EmbedBuilder()
                .setTitle(`🎉 ÇEKİLİŞ: ${odul}`)
                .setDescription(`Katılmak için aşağıdaki 🎉 butonuna tıklayın!\n\n⏳ **Bitiş:** <t:${bitisZamani}:R>\n👑 **Kazanan Sayısı:** ${kazananSayisi}`)
                .setColor("Purple")
                .setFooter({ text: FOOTER_TEXT });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('cekilis_katil').setLabel('Katıl 🎉').setStyle(ButtonStyle.Success)
            );

            const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
            const katilanlar = new Set();
            const collector = message.createMessageComponentCollector({ time: sure * 60000 });

            collector.on('collect', async i => {
                if (i.customId === 'cekilis_katil') {
                    if (katilanlar.has(i.user.id)) {
                        katilanlar.delete(i.user.id);
                        await i.reply({ content: "Çekilişten katılımını çektin.", ephemeral: true });
                    } else {
                        katilanlar.add(i.user.id);
                        await i.reply({ content: "🎉 Çekilişe başarıyla katıldın!", ephemeral: true });
                    }
                }
            });

            collector.on('end', async () => {
                const katilanDizi = Array.from(katilanlar);
                if (katilanDizi.length < kazananSayisi) {
                    const embedEnd = new EmbedBuilder().setTitle(`🎉 ÇEKİLİŞ BİTTİ: ${odul}`).setDescription("Yeterli katılım olmadığı için kazanan seçilemedi.").setColor("Red");
                    await message.edit({ embeds: [embedEnd], components: [] });
                } else {
                    const kazananlar = [];
                    for (let i = 0; i < kazananSayisi; i++) {
                        const rastgele = Math.floor(Math.random() * katilanDizi.length);
                        kazananlar.push(`<@${katilanDizi.splice(rastgele, 1)[0]}>`);
                    }
                    const embedEnd = new EmbedBuilder().setTitle(`🎉 ÇEKİLİŞ SONUÇLANDI: ${odul}`).setDescription(`🏆 **Kazananlar:** ${kazananlar.join(', ')}`).setColor("Gold");
                    await message.edit({ embeds: [embedEnd], components: [] });
                    await message.channel.send(`🎉 Tebrikler ${kazananlar.join(', ')}! **${odul}** kazandınız!`);
                }
            });
        }

        if (commandName === 'ticket-son') {
            if (!interaction.channel.name.includes("talep-") && !interaction.channel.name.includes("basvuru-")) {
                return interaction.reply({ content: "Bu komut sadece talep kanallarında kullanılabilir!", ephemeral: true });
            }
            await interaction.reply({ content: "Talep sonlandırılıyor..." });
            setTimeout(async () => { await interaction.channel.delete().catch(() => {}); }, 3000);
        }

        if (commandName === 'yanıt') {
            if (!interaction.member.roles.cache.has(ROLES.destekEkibi)) return interaction.reply({ content: "Yetkin yok!", ephemeral: true });
            const secim = interaction.options.getString('secenek');
            let metin = "";
            if (secim === '1') metin = "Sorununuz ile ilgili inceleme başlatılmıştır, lütfen bekleyiniz.";
            if (secim === '2') metin = "Lütfen oyundan çıkıp tekrar giriş yaparak tekrar denermisiniz?";
            if (secim === '3') metin = "Yaşadığınız sorunu gösteren bir ekran görüntüsü veya video iletir misiniz?";
            await interaction.reply({ content: metin });
        }

        if (commandName === 'owner') {
            if (!OWNERS.includes(interaction.user.id)) return interaction.reply({ content: "Yetkin yok!", ephemeral: true });
            const embed = new EmbedBuilder().setTitle("👑 Kurucu Kontrol Paneli").setDescription("Panelleri kurmak için aşağıdaki butona basın.").setColor("Red");
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('panelleri_kur').setLabel('Tüm Panelleri Gönder').setStyle(ButtonStyle.Success));
            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        }

        if (commandName === 'panelgönder') {
            if (!OWNERS.includes(interaction.user.id)) return interaction.reply({ content: "Yetkin yok!", ephemeral: true });
            await sendAllPanels(interaction);
        }
    }

    if (interaction.isButton()) {
        const id = interaction.customId;

        if (id === 'panelleri_kur') {
            if (!OWNERS.includes(interaction.user.id)) return interaction.reply({ content: "Yetkin yok!", ephemeral: true });
            await sendAllPanels(interaction, true);
        }

        if (id === 'talep_skyblock' || id === 'talep_genel') {
            const kategori = id === 'talep_skyblock' ? "skyblock" : "genel";
            const parentChan = client.channels.cache.get(CHANNELS.destekKategori);
            
            const ticketChannel = await interaction.guild.channels.create({
                name: `talep-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: parentChan ? parentChan.id : null,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: ROLES.destekEkibi, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: kategori === 'skyblock' ? ROLES.skyblockDestek : ROLES.genelDestek, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
                ]
            });

            const embed = new EmbedBuilder().setTitle(`${SERVER_NAME} Destek Talebi`).setDescription(`Hoş geldin ${interaction.user}, yetkili ekibi birazdan seninle ilgilenecektir.`).setColor("Blue");
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('talep_ustlen').setLabel('Talebi Üstlen').setStyle(ButtonStyle.Success));

            await ticketChannel.send({ content: `<@&${ROLES.destekEkibi}>`, embeds: [embed], components: [row] });
            await interaction.reply({ content: `Destek talebiniz açıldı: ${ticketChannel}`, ephemeral: true });
        }

        if (id === 'talep_ustlen') {
            await interaction.update({ components: [] });
            await interaction.channel.send(`🔒 Destek ekibinden **${interaction.user.tag}** talebi üstlendi.`);
        }

        if (id === 'oneri_gonder') {
            const modal = new ModalBuilder().setCustomId('oneriModal').setTitle('Öneri Gönder');
            const input = new TextInputBuilder().setCustomId('oneriInput').setLabel('Öneriniz Nedir?').setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }

        if (id === 'hata_gonder') {
            const modal = new ModalBuilder().setCustomId('hataModal').setTitle('Hata Bildir');
            const input = new TextInputBuilder().setCustomId('hataInput').setLabel('Hata Nedir?').setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }

        if (id === 'basvuru_yap') {
            const modal = new ModalBuilder().setCustomId('basvuruModal').setTitle('Yetkili Başvuru');
            const ad = new TextInputBuilder().setCustomId('b_ad').setLabel('Adınız').setStyle(TextInputStyle.Short).setRequired(true);
            const yas = new TextInputBuilder().setCustomId('b_yas').setLabel('Yaşınız').setStyle(TextInputStyle.Short).setRequired(true);
            const sehir = new TextInputBuilder().setCustomId('b_sehir').setLabel('Şehriniz').setStyle(TextInputStyle.Short).setRequired(true);
            const deneyim = new TextInputBuilder().setCustomId('b_deneyim').setLabel('Deneyiminiz').setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(ad), new ActionRowBuilder().addComponents(yas), new ActionRowBuilder().addComponents(sehir), new ActionRowBuilder().addComponents(deneyim));
            await interaction.showModal(modal);
        }

        if (id === 'oy_evet' || id === 'oy_hayir') {
            await interaction.reply({ content: `Oyunuz kaydedildi: **${id === 'oy_evet' ? 'Evet 👍' : 'Hayır 👎'}**`, ephemeral: true });
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'oneriModal') {
            const metin = interaction.fields.getTextInputValue('oneriInput');
            const listeChan = client.channels.cache.get(CHANNELS.oneriListe);
            const embed = new EmbedBuilder().setTitle(`💡 Öneri - ${interaction.user.tag}`).setDescription(metin).setColor("Green");
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('oy_evet').setLabel('👍 Evet').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('oy_hayir').setLabel('👎 Hayır').setStyle(ButtonStyle.Danger)
            );
            if (listeChan) await listeChan.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: "Öneriniz iletildi!", ephemeral: true });
        }

        if (interaction.customId === 'hataModal') {
            const metin = interaction.fields.getTextInputValue('hataInput');
            const listeChan = client.channels.cache.get(CHANNELS.hataListe);
            const embed = new EmbedBuilder().setTitle(`🐛 Hata - ${interaction.user.tag}`).setDescription(metin).setColor("Red");
            if (listeChan) await listeChan.send({ embeds: [embed] });
            await interaction.reply({ content: "Hata bildiriminiz iletildi!", ephemeral: true });
        }

        if (interaction.customId === 'basvuruModal') {
            const ad = interaction.fields.getTextInputValue('b_ad');
            const yas = interaction.fields.getTextInputValue('b_yas');
            const sehir = interaction.fields.getTextInputValue('b_sehir');
            const deneyim = interaction.fields.getTextInputValue('b_deneyim');

            const thread = await interaction.channel.threads.create({
                name: `başvuru-${interaction.user.username}`,
                autoArchiveDuration: 60
            });

            const embed = new EmbedBuilder().setTitle(`📋 Başvuru: ${interaction.user.tag}`).addFields(
                { name: 'Ad Soyad', value: ad },
                { name: 'Yaş', value: yas },
                { name: 'Şehir', value: sehir },
                { name: 'Deneyim', value: deneyim }
            ).setColor("Purple");

            await thread.send({ content: `<@&${ROLES.destekEkibi}> Yeni başvuru!`, embeds: [embed] });
            await interaction.reply({ content: `Başvurunuz oluşturuldu: ${thread}`, ephemeral: true });
        }
    }
});

async function sendAllPanels(interaction, isEphemeral = false) {
    const destekChan = client.channels.cache.get(CHANNELS.destekPanel);
    if (destekChan) {
        const embed = new EmbedBuilder().setTitle(`${SERVER_NAME} Destek`).setDescription("Talep açmak için tıklayın.").setColor("Blue");
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('talep_skyblock').setLabel('Skyblock Destek').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('talep_genel').setLabel('Genel Destek').setStyle(ButtonStyle.Secondary)
        );
        await destekChan.send({ embeds: [embed], components: [row] });
    }

    const hesapChan = client.channels.cache.get(CHANNELS.hesapEslestirme);
    if (hesapChan) {
        const embed = new EmbedBuilder().setTitle(`${SERVER_NAME} Hesap Eşleme`).setDescription("Sistem şu an devre dışıdır.").setColor("Grey");
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('hesap_esle').setLabel('Hesap Eşle').setStyle(ButtonStyle.Danger).setDisabled(true));
        await hesapChan.send({ embeds: [embed], components: [row] });
    }

    const oneriChan = client.channels.cache.get(CHANNELS.oneriPanel);
    if (oneriChan) {
        const embed = new EmbedBuilder().setTitle(`${SERVER_NAME} Öneri`).setDescription("Öneri bırakın.").setColor("Green");
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('oneri_gonder').setLabel('Öneri Yap').setStyle(ButtonStyle.Success));
        await oneriChan.send({ embeds: [embed], components: [row] });
    }

    const hataChan = client.channels.cache.get(CHANNELS.hataPanel);
    if (hataChan) {
        const embed = new EmbedBuilder().setTitle(`${SERVER_NAME} Hata Bildirimi`).setDescription("Bug bildirin.").setColor("Orange");
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('hata_gonder').setLabel('Hata Bildir').setStyle(ButtonStyle.Danger));
        await hataChan.send({ embeds: [embed], components: [row] });
    }

    const basvuruChan = client.channels.cache.get(CHANNELS.basvuruPanel);
    if (basvuruChan) {
        const embed = new EmbedBuilder().setTitle(`${SERVER_NAME} Yetkili Başvuru`).setDescription("Ekibe katılın.").setColor("Purple");
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('basvuru_yap').setLabel('Başvuru Oluştur').setStyle(ButtonStyle.Primary));
        await basvuruChan.send({ embeds: [embed], components: [row] });
    }

    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: "Tüm paneller gönderildi!", ephemeral: isEphemeral });
    } else {
        await interaction.reply({ content: "Tüm paneller gönderildi!", ephemeral: isEphemeral });
    }
}

client.login(process.env.TOKEN);
