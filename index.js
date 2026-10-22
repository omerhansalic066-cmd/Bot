// --- MODAL GÖNDERİMLERİ ---
    if (interaction.isModalSubmit()) {
        const { customId, member, fields, guild } = interaction;

        // Hile Kontrol Kaydı
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

        // Öneri Gönderimi
        if (customId === 'modal_suggestion') {
            const text = fields.getTextInputValue('s_text');
            const sugCh = guild.channels.cache.get(CONFIG.CHANNELS.ONERI_LISTE);
            
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setAuthor({ name: `${member.user.tag} Tarafından Öneri`, iconURL: member.user.displayAvatarURL() })
                .setDescription(text)
                .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
                .setTimestamp();

            if (sugCh) {
                const msg = await sugCh.send({ embeds: [embed] });
                await msg.react('👍');
                await msg.react('👎');
            }
            return interaction.reply({ content: '✅ Öneriniz başarıyla öneri kanalına gönderildi.', ephemeral: true });
        }

        // Hata Bildirimi
        if (customId === 'modal_bug') {
            const text = fields.getTextInputValue('b_text');
            const bugCh = guild.channels.cache.get(CONFIG.CHANNELS.HATA_LISTE);
            
            const embed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setAuthor({ name: `${member.user.tag} Hata Bildirimi`, iconURL: member.user.displayAvatarURL() })
                .setDescription(text)
                .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
                .setTimestamp();

            if (bugCh) await bugCh.send({ embeds: [embed] });
            return interaction.reply({ content: '✅ Hata bildiriminiz yetkililere iletildi.', ephemeral: true });
        }

        // Yetkili Başvurusu Gönderimi
        if (customId === 'modal_staff_app') {
            const age = fields.getTextInputValue('app_age');
            const time = fields.getTextInputValue('app_time');
            const why = fields.getTextInputValue('app_why');
            const appCh = guild.channels.cache.get(CONFIG.CHANNELS.BASVURU_FORM);

            const embed = new EmbedBuilder()
                .setColor('#9b59b6')
                .setAuthor({ name: `${member.user.tag} • Yeni Yetkili Başvurusu`, iconURL: member.user.displayAvatarURL() })
                .addFields(
                    { name: '👤 Aday', value: `${member} (\`${member.id}\`)`, inline: false },
                    { name: '🎂 Yaş', value: `\`${age}\``, inline: true },
                    { name: '⏱️ Aktiflik', value: `\`${time}\``, inline: true },
                    { name: '💡 Neden Biz?', value: why, inline: false }
                )
                .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
                .setTimestamp();

            if (appCh) await appCh.send({ embeds: [embed] });
            return interaction.reply({ content: '✅ Yetkili başvuru formu başarıyla gönderildi!', ephemeral: true });
        }

        // Destek Talebi Açma Formu
        if (customId.startsWith('modal_ticket_open_')) {
            const cat = customId.replace('modal_ticket_open_', '');
            const ign = fields.getTextInputValue('t_ign');
            const issue = fields.getTextInputValue('t_issue');

            const ticketChannelName = `talep-${member.user.username}`.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            try {
                const ticketChannel = await guild.channels.create({
                    name: ticketChannelName,
                    type: ChannelType.GuildText,
                    parent: CONFIG.CHANNELS.TICKET_CATEGORY || null,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                        { id: CONFIG.ROLES.YETKILI_EKIBI, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
                    ]
                });

                const ticketEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setAuthor({ name: `${CONFIG.SERVER.NAME} • Destek Talebi`, iconURL: CONFIG.SERVER.ICON_URL })
                    .setDescription(`Merhaba ${member}, talebiniz başarıyla oluşturuldu. Yetkili ekibimiz en kısa sürede ilgilenecektir.`)
                    .addFields(
                        { name: '📂 Kategori', value: `\`${cat.toUpperCase()}\``, inline: true },
                        { name: '🎮 Minecraft Nick', value: `\`${ign}\``, inline: true },
                        { name: '📝 Sorun / Açıklama', value: `> ${issue}`, inline: false }
                    )
                    .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
                    .setTimestamp();

                const actionRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('btn_ticket_claim').setLabel('Talebi Üstlen').setStyle(ButtonStyle.Primary).setEmoji('🙋‍♂️'),
                    new ButtonBuilder().setCustomId('btn_ticket_close').setLabel('Talebi Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );

                await ticketChannel.send({ content: `${member} | <@&${CONFIG.ROLES.YETKILI_EKIBI}>`, embeds: [ticketEmbed], components: [actionRow] });
                return interaction.reply({ content: `✅ Talebiniz başarıyla açıldı: ${ticketChannel}`, ephemeral: true });
            } catch (err) {
                console.error('[HATA] Talep kanalı oluşturulamadı:', err);
                return interaction.reply({ content: '❌ Talep kanalı oluşturulurken bir hata oluştu.', ephemeral: true });
            }
        }
    }
