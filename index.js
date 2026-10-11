const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');

const CONFIG = {
    // Token güvenliği için çevre değişkeninden alınıyor
    TOKEN: process.env.DISCORD_TOKEN,
    CLIENT_ID: "1558576662340313100",
    
    // Roller & Kanallar
    AUTO_ROLE_ID: "1542141103988277259",               // Oyuncu Rolü
    WELCOME_CHANNEL_ID: "1542300436965490789",          // Hoş Geldin Kanalı
    GIVEAWAY_CHANNEL_ID: "1542145961147629639",        // Çekiliş Kanalı
    ACCOUNT_LINK_CHANNEL_ID: "1555916520306254027",    // Hesap Eşle Kanalı
    
    // Log ve Bildirim Kanalları
    STAFF_APPLICATION_CHANNEL_ID: "1556051449723748443", // Başvuru Log
    BUG_LOG_CHANNEL_ID: "1555959502833057823",         // Hata Bildirim Log
    SUGGESTION_CHANNEL_ID: "1542145766855020555",      // Öneri Kanalı
    STAFF_LOG_CHANNEL_ID: "1542146177665994862",       // Yetkili Log
    TICKET_LOG_CHANNEL_ID: "1556241725868081222",      // Ticket Log
    
    // Destek & Ticket Ayarları
    TICKET_CATEGORY_ID: "1555902176382156840"          // Ticket Kategori ID
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember]
});

client.once('clientReady', async () => {
    console.log(`[BOT] ${client.user.tag} olarak giriş yapıldı!`);

    const commands = [
        { name: 'panelyukle', description: 'Tüm butonların olduğu ana paneli gönderir.' },
        { name: 'ticket-paneli', description: 'Sadece Destek Talebi butonunu gönderir.' },
        { name: 'basvuru-paneli', description: 'Sadece Yetkili Başvurusu butonunu gönderir.' },
        { name: 'hata-paneli', description: 'Sadece Hata Bildirimi butonunu gönderir.' },
        { name: 'oneri-paneli', description: 'Sadece Öneri Gönder butonunu gönderir.' }
    ];

    try {
        console.log("[SİSTEM] Komutlar sunucuya yükleniyor...");
        const firstGuild = client.guilds.cache.first();
        if (firstGuild) {
            await firstGuild.commands.set(commands);
            console.log(`[SİSTEM] Tüm komutlar "${firstGuild.name}" sunucusuna BAŞARIYLA yüklendi!`);
        } else {
            await client.application.commands.set(commands);
            console.log("[SİSTEM] Komutlar genel olarak yüklendi!");
        }
    } catch (error) {
        console.error("Komut yükleme hatası:", error);
    }
});

// Otomatik Oyuncu Rolü
client.on('guildMemberAdd', async member => {
    try {
        const autoRole = member.guild.roles.cache.get(CONFIG.AUTO_ROLE_ID);
        if (autoRole) {
            await member.roles.add(autoRole);
            console.log(`[OTO ROL] ${member.user.tag} kullanıcısına ${autoRole.name} rolü verildi.`);
        }
    } catch (err) {
        console.error(`[OTO ROL HATASI]`, err.message);
    }
});

// Etkileşimler (Komutlar, Butonlar, Formlar)
client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        const { commandName, member } = interaction;

        if (['panelyukle', 'ticket-paneli', 'basvuru-paneli', 'hata-paneli', 'oneri-paneli'].includes(commandName)) {
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: '❌ Bu komutu kullanmak için Yönetici yetkin olmalı!', flags: MessageFlags.Ephemeral });
            }

            if (commandName === 'panelyukle') {
                const embed = new EmbedBuilder().setColor('#ff4757').setTitle('🎮 TürkiyeCraft Destek ve İşlem Paneli').setDescription('Aşağıdaki butonları kullanarak işlemlerinizi gerçekleştirebilirsiniz.');
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('btn_ticket').setLabel('Destek Talebi').setStyle(ButtonStyle.Primary).setEmoji('✉️'),
                    new ButtonBuilder().setCustomId('btn_staff').setLabel('Yetkili Başvurusu').setStyle(ButtonStyle.Success).setEmoji('🤵'),
                    new ButtonBuilder().setCustomId('btn_bug').setLabel('Hata Bildir').setStyle(ButtonStyle.Danger).setEmoji('🐛'),
                    new ButtonBuilder().setCustomId('btn_suggestion').setLabel('Öneri Yap').setStyle(ButtonStyle.Secondary)
                );
                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.reply({ content: '✅ Genel panel yüklendi!', flags: MessageFlags.Ephemeral });
            }

            if (commandName === 'ticket-paneli') {
                const embed = new EmbedBuilder().setColor('#0099ff').setTitle('✉️ TürkiyeCraft Destek Talebi').setDescription('Yardıma ihtiyacınız varsa butona basarak destek talebi açabilirsiniz.');
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_ticket').setLabel('Destek Talebi Aç').setStyle(ButtonStyle.Primary).setEmoji('✉️'));
                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.reply({ content: '✅ Ticket paneli yüklendi!', flags: MessageFlags.Ephemeral });
            }

            if (commandName === 'basvuru-paneli') {
                const embed = new EmbedBuilder().setColor('#2ecc71').setTitle('🤵 TürkiyeCraft Yetkili Başvurusu').setDescription('Ekibimize katılmak için butona basarak formu doldurun.');
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_staff').setLabel('Başvuru Yap').setStyle(ButtonStyle.Success).setEmoji('📋'));
                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.reply({ content: '✅ Başvuru paneli yüklendi!', flags: MessageFlags.Ephemeral });
            }

            if (commandName === 'hata-paneli') {
                const embed = new EmbedBuilder().setColor('#e74c3c').setTitle('🐛 TürkiyeCraft Hata Bildirimi').setDescription('Sunucuda karşılaştığınız bir hatayı bildirmek için tıklayın.');
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_bug').setLabel('Hata Bildir').setStyle(ButtonStyle.Danger).setEmoji('🐛'));
                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.reply({ content: '✅ Hata bildirim paneli yüklendi!', flags: MessageFlags.Ephemeral });
            }

            if (commandName === 'oneri-paneli') {
                const embed = new EmbedBuilder().setColor('#f1c40f').setTitle('💡 TürkiyeCraft Öneri Gönder').setDescription('Önerilerinizi bizimle paylaşın.');
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_suggestion').setLabel('Öneri Yap').setStyle(ButtonStyle.Secondary));
                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.reply({ content: '✅ Öneri paneli yüklendi!', flags: MessageFlags.Ephemeral });
            }
        }
    }

    // Buton İşlemleri
    if (interaction.isButton()) {
        const { customId, guild, user, channel } = interaction;

        if (customId === 'btn_ticket') {
            const channelName = `ticket-${user.username.toLowerCase()}`;
            const existing = guild.channels.cache.find(c => c.name === channelName);
            if (existing) {
                return interaction.reply({ content: `Zaten açık bir destek talebin var: ${existing}`, flags: MessageFlags.Ephemeral });
            }

            try {
                const ticketChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: CONFIG.TICKET_CATEGORY_ID,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles] }
                    ]
                });

                const ticketRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('btn_claim_ticket').setLabel('Talebi Üstlen').setStyle(ButtonStyle.Success).setEmoji('🙋‍♂️'),
                    new ButtonBuilder().setCustomId('btn_close_ticket').setLabel('Talebi Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );

                await ticketChannel.send({ content: `Hoş geldin ${user}! Yetkililerimiz birazdan seninle ilgilenecektir.`, components: [ticketRow] });
                await interaction.reply({ content: `✅ Destek talebin oluşturuldu: ${ticketChannel}`, flags: MessageFlags.Ephemeral });

                // Ticket Log
                const logChannel = guild.channels.cache.get(CONFIG.TICKET_LOG_CHANNEL_ID);
                if (logChannel) {
                    const embed = new EmbedBuilder().setColor('#0099ff').setTitle('✉️ Yeni Destek Talebi Açıldı').addFields({ name: 'Açan', value: `${user.tag}` }, { name: 'Kanal', value: `${ticketChannel.name}` }).setTimestamp();
                    await logChannel.send({ embeds: [embed] });
                }
            } catch (e) {
                await interaction.reply({ content: '❌ Ticket kanalı açılırken hata oluştu!', flags: MessageFlags.Ephemeral });
            }
        }

        if (customId === 'btn_claim_ticket') {
            const embed = new EmbedBuilder().setColor('#2ecc71').setDescription(`🙋‍♂️ Bu destek talebi **${user.tag}** adlı yetkili tarafından üstlenildi.`);
            await interaction.reply({ embeds: [embed] });
        }

        if (customId === 'btn_close_ticket') {
            await interaction.reply({ content: '🔒 Destek talebi 5 saniye içinde kapatılıyor...' });

            const logChannel = guild.channels.cache.get(CONFIG.TICKET_LOG_CHANNEL_ID);
            if (logChannel) {
                const embed = new EmbedBuilder().setColor('#e74c3c').setTitle('🔒 Destek Talebi Kapatıldı').addFields({ name: 'Kapatan / Kanal', value: `${user.tag} tarafından **#${channel.name}** kapatıldı.` }).setTimestamp();
                await logChannel.send({ embeds: [embed] });
            }

            setTimeout(() => channel.delete().catch(() => {}), 5000);
        }

        if (customId === 'btn_staff') {
            const modal = new ModalBuilder().setCustomId('modal_staff').setTitle('TürkiyeCraft Yetkili Başvurusu');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('staff_name').setLabel('Adınız ve Yaşınız?').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('staff_time').setLabel('Günde kaç saat aktifsin?').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('staff_exp').setLabel('Tecrübeleriniz?').setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            await interaction.showModal(modal);
        }

        if (customId === 'btn_bug') {
            const modal = new ModalBuilder().setCustomId('modal_bug').setTitle('Hata Bildirim Sistemi');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('bug_content').setLabel('Karşılaştığınız hata nedir?').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            await interaction.showModal(modal);
        }

        if (customId === 'btn_suggestion') {
            const modal = new ModalBuilder().setCustomId('modal_suggestion').setTitle('Öneri Gönder');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('sug_content').setLabel('Öneriniz nedir?').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            await interaction.showModal(modal);
        }
    }

    // Modal Form Gönderimleri
    if (interaction.isModalSubmit()) {
        const { customId, user, guild } = interaction;

        if (customId === 'modal_staff') {
            const name = interaction.fields.getTextInputValue('staff_name');
            const time = interaction.fields.getTextInputValue('staff_time');
            const exp = interaction.fields.getTextInputValue('staff_exp');

            const logChannel = guild.channels.cache.get(CONFIG.STAFF_APPLICATION_CHANNEL_ID);
            if (logChannel) {
                const embed = new EmbedBuilder().setColor('#00ff00').setTitle('📋 Yeni Yetkili Başvurusu').addFields({ name: 'Kullanıcı', value: `${user.tag}` }, { name: 'Ad / Yaş', value: name }, { name: 'Aktiflik', value: time }, { name: 'Tecrübeler', value: exp }).setTimestamp();
                await logChannel.send({ embeds: [embed] });
            }
            await interaction.reply({ content: '✅ Başvurunuz başarıyla iletildi!', flags: MessageFlags.Ephemeral });
        }

        if (customId === 'modal_bug') {
            const bugContent = interaction.fields.getTextInputValue('bug_content');
            const logChannel = guild.channels.cache.get(CONFIG.BUG_LOG_CHANNEL_ID);
            if (logChannel) {
                const embed = new EmbedBuilder().setColor('#ff0000').setTitle('🐛 Yeni Hata Bildirimi').addFields({ name: 'Bildiren', value: `${user.tag}` }, { name: 'Hata Detayı', value: bugContent }).setTimestamp();
                const sentMsg = await logChannel.send({ embeds: [embed] });
                
                // 30 Dakika Sonra Silme
                setTimeout(() => sentMsg.delete().catch(() => {}), 30 * 60 * 1000);
            }
            await interaction.reply({ content: '✅ Hata bildirimi iletildi (30 dk sonra logtan silinecek)!', flags: MessageFlags.Ephemeral });
        }

        if (customId === 'modal_suggestion') {
            const sugContent = interaction.fields.getTextInputValue('sug_content');
            const logChannel = guild.channels.cache.get(CONFIG.SUGGESTION_CHANNEL_ID);
            if (logChannel) {
                const embed = new EmbedBuilder().setColor('#3498db').setTitle('💡 Yeni Öneri').addFields({ name: 'Öneren', value: `${user.tag}` }, { name: 'Öneri', value: sugContent }).setTimestamp();
                const sentMsg = await logChannel.send({ embeds: [embed] });
                await sentMsg.react('👍');
                await sentMsg.react('👎');

                // 40 Dakika Sonra Silme
                setTimeout(() => sentMsg.delete().catch(() => {}), 40 * 60 * 1000);
            }
            await interaction.reply({ content: '✅ Öneriniz iletildi (40 dk sonra kanaldan silinecek)!', flags: MessageFlags.Ephemeral });
        }
    }
});

client.login(CONFIG.TOKEN);