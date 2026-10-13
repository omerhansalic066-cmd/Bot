const { 
    Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, 
    TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits 
} = require('discord.js');
const Database = require('better-sqlite3');
const db = new Database('turkiyecraft.db');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// Veritabanı Tablolarını Oluşturma
db.prepare("CREATE TABLE IF NOT EXISTS economy (userId TEXT PRIMARY KEY, credits INTEGER, lastDaily TEXT)").run();
db.prepare("CREATE TABLE IF NOT EXISTS tempchannels (channelId TEXT PRIMARY KEY, ownerId TEXT)").run();

const CONFIG = {
    owners: ["1430625826902114396", "1452002283389849690", "1429198833832951808"],
    footerText: "TürkiyeCraft • Power by ttcodersstudio",
    logoUrl: "https://cdn.phototourl.com/member/2026-10-04-f510ec96-2c1f-460d-b83b-1df025e95f83.jpg",
    
    // Kanallar
    channels: {
        destekPanel: "1555902176382156840",
        destekKategori: "1555902219050684526",
        destekLog: "1555902250000000001", // Log kanalı eklendi
        hesapEkle: "1555916520306254027",
        takviyePanel: "1555990802533056573",
        oneriPanel: "1542145766855020555",
        hataPanel: "1555959502833057823",
        oneriListe: "1542150697523617863",
        hataListe: "1555959597871669398",
        basvuruSart: "1555272732566888488",
        basvuruPanel: "1556051449723748443",
        market: "1555989121808465981",
        kurallar: "1542141049118527568",
        tempOdaKur: "1542194628332101694",
        tempKategori: "1542194376032129125"
    },

    // Roller
    roles: {
        destekEkibi: "1542296519628034128",
        genelDestek: "1555291620876750918",
        skyblockDestek: "1555291670151561227",
        onayliUye: "1555294900520493118",
        vip: "1555294079921819849",
        ranks: {
            "netherite": "1555989344530202805",
            "zümrüt": "1555989464751276173",
            "elmas": "1555989498280812615",
            "altın": "1555989536558030939",
            "demir": "1555989564823314482",
            "bakır": "1555989605357195364",
            "kömür": "1555989637183443125"
        }
    }
};

client.once('ready', () => {
    console.log(`[BAŞARILI] ${client.user.tag} TürkiyeCraft sistemleri ile aktif hale getirildi!`);
});

// -------------------------------------------------------------------------
// GELİŞMİŞ KÜFÜR, SPAM VE OTOMATİK YANIT SİSTEMİ
// -------------------------------------------------------------------------
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // Küfür & Reklam Koruması
    const yasakliKelimeler = ["küfür1", "discord.gg", "http://", "https://", "t.me/", "bozuklink"];
    if (yasakliKelimeler.some(kelime => message.content.toLowerCase().includes(kelime))) {
        if (!CONFIG.owners.includes(message.author.id) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.delete().catch(() => {});
            const uyari = await message.channel.send(`⚠️ **TürkiyeCraft Güvenlik:** ${message.author}, bu sunucuda küfür, argo veya reklam paylaşmak kesinlikle yasaktır!`);
            setTimeout(() => uyari.delete().catch(() => {}), 5000);
            return;
        }
    }

    // Büyük Harf (Caps Lock) Koruması (%75+)
    const harfler = message.content.replace(/[^A-ZİĞÜŞÖÇ]/g, "").length;
    if (message.content.length > 12 && (harfler / message.content.length) > 0.75) {
        await message.delete().catch(() => {});
        const uyari = await message.channel.send(`⚠️ **TürkiyeCraft Güvenlik:** ${message.author}, lütfen sohbet kanallarında aşırı büyük harf (Caps Lock) kullanmayınız.`);
        setTimeout(() => uyari.delete().catch(() => {}), 4000);
        return;
    }

    // Detaylı Otomatik Yanıtlar
    const mesajMetni = message.content.toLowerCase();
    if (mesajMetni === "sa" || mesajMetni === "selam" || mesajMetni === "selamın aleyküm") {
        message.reply("Aleykümselam, TürkiyeCraft Discord sunucumuza hoş geldin! Keyifli oyunlar dileriz.");
    } else if (mesajMetni.includes("iyi akşamlar")) {
        message.reply("İyi akşamlar dileriz! TürkiyeCraft maceralarında bol şans.");
    } else if (mesajMetni.includes("günaydın") || mesajMetni.includes("günaydün")) {
        message.reply("Günaydın! Bugün sunucumuzda harika etkinlikler seni bekliyor.");
    } else if (mesajMetni.includes("nasılsın")) {
        message.reply("Ben TürkiyeCraft'ın resmi yapay zeka asistanıyım! Oyuncularımıza hizmet etmekten mutluluk duyuyorum. Sen nasılsın?");
    } else if (mesajMetni.includes("ıp") || mesajMetni.includes("ip") || mesajMetni.includes("adres")) {
        message.reply("🌐 **TürkiyeCraft Sunucu Bilgileri:**\n• **IP Adresi:** `play.turkiyecraft.net`\n• **Sürüm:** `1.16.5 - 20.x`\n• **Web Sitesi:** `www.turkiyecraft.net`");
    }

    // Komut İşleyici
    const args = message.content.trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // /yardım
    if (command === "!yardım") {
        const embed = new EmbedBuilder()
            .setTitle("🛡️ TürkiyeCraft - Yardım ve Komut Merkezi")
            .setColor("Gold")
            .setDescription("Sunucumuzda kullanabileceğiniz komutlar ve açıklamaları aşağıda listelenmiştir:")
            .addFields(
                { name: "💰 Ekonomi Komutları", value: "`!günlüködül` - Her gün 10 ile 30 arası kredi kazanırsınız.\n`!kredim` - Mevcut kredinizi görüntülersiniz." },
                { name: "🎲 Eğlence Komutları", value: "`!zar` - 1'den 6'ya kadar zar atarsınız.\n`!yazıtura` - Yazı mı Tura mı atarsınız." },
                { name: "🛠️ Yetkili Komutları", value: "`!yanıt [metin]` - Destek taleplerinde hazır şablon gönderir.\n`!temizle [1-100]` - Belirtilen miktarda mesajı siler.\n`!owner` - Kurucu kontrol paneli." }
            )
            .setFooter({ text: CONFIG.footerText, iconURL: CONFIG.logoUrl });
        return message.reply({ embeds: [embed] });
    }

    // /günlüködül
    if (command === "!günlüködül") {
        const userId = message.author.id;
        const bugun = new Date().toDateString();
        let kullanici = db.prepare("SELECT * FROM economy WHERE userId = ?").get(userId);

        if (kullanici && kullanici.lastDaily === bugun) {
            return message.reply("⏳ Günlük ödülünü bugün zaten aldın. Lütfen yarın tekrar dene!");
        }

        const kazanilanKredi = Math.floor(Math.random() * 21) + 10; // 10-30 arası
        if (!kullanici) {
            db.prepare("INSERT INTO economy (userId, credits, lastDaily) VALUES (?, ?, ?)").run(userId, kazanilanKredi, bugun);
        } else {
            db.prepare("UPDATE economy SET credits = credits + ?, lastDaily = ? WHERE userId = ?").run(kazanilanKredi, bugun, userId);
        }
        return message.reply(`🎉 Tebrikler! Günlük ödül olarak **${kazanilanKredi} Kredi** hesabına eklendi.`);
    }

    // /kredim
    if (command === "!kredim") {
        let kullanici = db.prepare("SELECT * FROM economy WHERE userId = ?").get(message.author.id);
        const bakiye = kullanici ? kullanici.credits : 0;
        return message.reply(`💳 Mevcut TürkiyeCraft Krediniz: **${bakiye} Kredi**`);
    }

    // /zar
    if (command === "!zar") {
        const sonuc = Math.floor(Math.random() * 6) + 1;
        return message.reply(`🎲 Zar atıldı ve gelen sonuç: **${sonuc}**`);
    }

    // /yazıtura
    if (command === "!yazıtura") {
        const sonuc = Math.random() < 0.5 ? "Yazı 🦅" : "Tura 👑";
        return message.reply(`🪙 Para havaya atıldı ve sonuç: **${sonuc}**`);
    }

    // /temizle
    if (command === "!temizle") {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ Bu komutu kullanmak için `Mesajları Yönet` yetkisine sahip olmalısın.");
        const miktar = parseInt(args[0]);
        if (!miktar || miktar < 1 || miktar > 100) return message.reply("⚠️ Lütfen silinecek 1 ile 100 arasında bir sayı belirt.");
        await message.channel.bulkDelete(miktar, true).catch(() => {});
        const bilgi = await message.channel.send(`✅ Başarıyla **${miktar}** adet mesaj temizlendi.`);
        setTimeout(() => bilgi.delete().catch(() => {}), 4000);
    }

    // /krediekle
    if (command === "!krediekle") {
        if (!CONFIG.owners.includes(message.author.id)) return message.reply("❌ Bu komut sadece sunucu kurucularına özeldir.");
        const hedef = message.mentions.users.first();
        const miktar = parseInt(args[1]);
        if (!hedef || !miktar) return message.reply("⚠️ Kullanım: `!krediekle @kullanici miktar`");

        let kayit = db.prepare("SELECT * FROM economy WHERE userId = ?").get(hedef.id);
        if (!kayit) {
            db.prepare("INSERT INTO economy (userId, credits, lastDaily) VALUES (?, ?, ?)").run(hedef.id, miktar, "");
        } else {
            db.prepare("UPDATE economy SET credits = credits + ? WHERE userId = ?").run(miktar, hedef.id);
        }
        return message.reply(`✅ ${hedef} adlı kullanıcıya başarıyla **${miktar} Kredi** eklendi.`);
    }

    // /owner
    if (command === "!owner") {
        if (!CONFIG.owners.includes(message.author.id)) return message.reply("❌ Bu alana sadece TürkiyeCraft Kurucuları erişebilir.");
        const embed = new EmbedBuilder()
            .setTitle("👑 TürkiyeCraft - Kurucu Yönetim Paneli")
            .setColor("DarkRed")
            .setDescription("Sistemlerin operasyonel durumu aşağıdadır:")
            .addFields(
                { name: "🔹 Destek Talepleri", value: "Çalışıyor (Aktif)", inline: true },
                { name: "🔹 Geçici Ses Odaları", value: "Çalışıyor (Aktif)", inline: true },
                { name: "🔹 Ekonomi & Kredi", value: "Veritabanı Senkronize", inline: true },
                { name: "🔹 Güvenlik & Korumalar", value: "Aktif Koruma Devrede", inline: true }
            )
            .setFooter({ text: CONFIG.footerText, iconURL: CONFIG.logoUrl });
        return message.reply({ embeds: [embed] });
    }

    // /yanıt
    if (command === "!yanıt") {
        if (!message.member.roles.cache.has(CONFIG.roles.destekEkibi)) return message.reply("❌ Bu komutu yalnızca Destek Ekibi üyeleri kullanabilir.");
        const metin = args.join(" ");
        if (!metin) return message.reply("⚠️ Lütfen iletmek istediğiniz yanıt metnini yazın.");
        return message.channel.send(`💬 **Yetkili Ekip Yanıtı:** ${metin}`);
    }

    // /panelgönder
    if (command === "!panelgönder") {
        if (!CONFIG.owners.includes(message.author.id)) return message.reply("❌ Yetkiniz yok.");

        // Destek Paneli Kurulumu
        const destekKanal = client.channels.cache.get(CONFIG.channels.destekPanel);
        if (destekKanal) {
            const embed = new EmbedBuilder()
                .setTitle("TürkiyeCraft Destek Merkezi")
                .setDescription("Sunucumuzla ilgili yaşadığınız tüm sorunları, soru ve önerileri destek ekibimize buradan bildirebilirsiniz.\n\n**Talep Adımları:**\n1. Aşağıdaki menüden ilgili kategoriyi seçin.\n2. Açılan özel kanalda sorununuzu detaylıca belirtin.\n3. Yetkili ekibimizin size yanıt vermesini sabırla bekleyin.")
                .setColor("Green")
                .setImage(CONFIG.logoUrl)
                .setFooter({ text: CONFIG.footerText });
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('destek_menu')
                    .setPlaceholder('Destek almak istediğiniz konuyu seçiniz...')
                    .addOptions([
                        { label: 'Skyblock Destek', value: 'skyblock', description: 'Skyblock oyun modu ile ilgili talepler', emoji: '☁️' },
                        { label: 'Genel Destek & Şikayet', value: 'genel', description: 'Genel sunucu ve site işlemleri', emoji: '🎫' }
                    ])
            );
            await destekKanal.send({ embeds: [embed], components: [row] });
        }

        return message.reply("✅ Tüm temel paneller başarıyla ilgili kanallara gönderildi!");
    }
});

// -------------------------------------------------------------------------
// ETKİLEŞİM YÖNETİCİSİ (DESTEK SİSTEMİ)
// -------------------------------------------------------------------------
client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'destek_menu') {
        const kategori = interaction.values[0];
        const guild = interaction.guild;
        const parentId = CONFIG.channels.destekKategori;

        const talepKanal = await guild.channels.create({
            parent: parentId,
            name: `talep-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                { id: CONFIG.roles.destekEkibi, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
            ]
        });

        const rolEtiket = kategori === 'skyblock' ? CONFIG.roles.skyblockDestek : CONFIG.roles.genelDestek;

        const embed = new EmbedBuilder()
            .setTitle("TürkiyeCraft - Destek Talebi")
            .setDescription(`Sayın <@${interaction.user.id}>, talebiniz başarıyla oluşturulmuştur. Yetkili ekibimiz en kısa sürede sizinle ilgilenecektir.`)
            .addFields(
                { name: "Kategori", value: kategori.toUpperCase(), inline: true },
                { name: "Talep Durumu", value: "🟡 Yetkili yanıtı bekleniyor.", inline: true }
            )
            .setColor("Green")
            .setFooter({ text: CONFIG.footerText, iconURL: CONFIG.logoUrl });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('talep_ustlen').setLabel('Talebi Üstlen').setStyle(ButtonStyle.Primary).setEmoji('🛡️'),
            new ButtonBuilder().setCustomId('talep_kapat').setLabel('Talebi Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒')
        );

        await talepKanal.send({ content: `<@&${rolEtiket}> <@&${CONFIG.roles.destekEkibi}>`, embeds: [embed], components: [row] });
        return interaction.reply({ content: `✅ Destek talebi kanalınız başarıyla oluşturuldu: ${talepKanal}`, ephemeral: true });
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'talep_ustlen') {
            await interaction.reply(`🔒 Bu talep **${interaction.user.tag}** tarafından üstlenilmiştir.`);
        }
        if (interaction.customId === 'talep_kapat') {
            await interaction.channel.send("⚠️ Destek talebi sonlandırılıyor, kanal birazdan silinecektir...");
            setTimeout(() => interaction.channel.delete().catch(() => {}), 4000);
        }
    }
});

// -------------------------------------------------------------------------
// GEÇİCİ SES ODALARI SİSTEMİ
// -------------------------------------------------------------------------
client.on('voiceStateUpdate', async (oldState, newState) => {
    const kurKanalId = CONFIG.channels.tempOdaKur;
    const kategoriId = CONFIG.channels.tempKategori;

    if (newState.channelId === kurKanalId) {
        const guild = newState.guild;
        const member = newState.member;

        const sesKanali = await guild.channels.create({
            name: `${member.user.username} - Oda`,
            type: ChannelType.GuildVoice,
            parent: kategoriId,
            permissionOverwrites: [
                { id: guild.id, allow: [PermissionFlagsBits.Connect] },
                { id: member.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers, PermissionFlagsBits.MoveMembers] }
            ]
        });

        db.prepare("INSERT INTO tempchannels (channelId, ownerId) VALUES (?, ?)").run(sesKanali.id, member.id);
        await member.voice.setChannel(sesKanali);
    }

    if (oldState.channel && oldState.channel.parentId === kategoriId) {
        if (oldState.channel.members.size === 0 && oldState.channel.id !== kurKanalId) {
            db.prepare("DELETE FROM tempchannels WHERE channelId = ?").run(oldState.channel.id);
            await oldState.channel.delete().catch(() => {});
        }
    }
});

// Botunuzun Discord Developer Portal'dan aldığınız Token değerini buraya girin:
client.login(process.env.DISCORD_TOKEN);

