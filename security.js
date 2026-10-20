const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const CONFIG = require('./config');

const userSpamMap = new Map();

function checkSecurityViolations(message) {
    if (!message.guild || message.author.bot) return false;
    
    // Yetkililer ve Kurucu korumalardan muaftır
    const isStaff = message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
                    message.member?.roles.cache.has(CONFIG.ROLES.YETKILI_EKIBI) ||
                    message.member?.roles.cache.has(CONFIG.ROLES.YONETICI) ||
                    message.author.id === CONFIG.OWNER_ID;
    if (isStaff) return false;

    const text = message.content;
    const logChannel = message.guild.channels.cache.get(CONFIG.CHANNELS.LOG_PUNISH);

    // 1. Reklam Koruması
    const inviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/gi;
    if (inviteRegex.test(text)) {
        message.delete().catch(() => {});
        message.channel.send(`⚠️ ${message.author}, sunucuda reklam yapmak kesinlikle yasaktır!`).then(m => setTimeout(() => m.delete().catch(() => {}), 4000));
        if (logChannel) {
            logChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#e74c3c')
                        .setAuthor({ name: `${CONFIG.SERVER.NAME} • Güvenlik Sistemi`, iconURL: CONFIG.SERVER.ICON_URL })
                        .setTitle('🛡️ Reklam Engellendi')
                        .setDescription(`**Kullanıcı:** ${message.author} (\`${message.author.id}\`)\n**Kanal:** ${message.channel}\n**Mesaj İçeriği:** \`${text}\``)
                        .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
                        .setTimestamp()
                ]
            }).catch(() => {});
        }
        return true;
    }

    // 2. Küfür ve Argo Koruması
    const normalizedText = text.toLowerCase().replace(/[^a-zçğışöü0-9]/g, '');
    const kufurRegex = /(o[çc]|a[mq]|amk|sik[ie]?|pi[çc]|yarra[kğ]|kahpe|orospu|g[öo]t[uü]?)/gi;
    if (kufurRegex.test(normalizedText)) {
        message.delete().catch(() => {});
        message.channel.send(`⚠️ ${message.author}, lütfen küfür ve argo sözcükler kullanmayınız!`).then(m => setTimeout(() => m.delete().catch(() => {}), 4000));
        if (logChannel) {
            logChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#e74c3c')
                        .setAuthor({ name: `${CONFIG.SERVER.NAME} • Güvenlik Sistemi`, iconURL: CONFIG.SERVER.ICON_URL })
                        .setTitle('🛡️ Otomatik Küfür Filtresi')
                        .setDescription(`**Kullanıcı:** ${message.author} (\`${message.author.id}\`)\n**Kanal:** ${message.channel}\n**Mesaj:** \`${text}\``)
                        .setFooter({ text: CONFIG.SERVER.FOOTER, iconURL: CONFIG.SERVER.ICON_URL })
                        .setTimestamp()
                ]
            }).catch(() => {});
        }
        return true;
    }

    // 3. CapsLock Koruması
    const cleanLetters = text.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, '');
    if (cleanLetters.length >= 8) {
        const upperCount = cleanLetters.replace(/[^A-ZÇĞİÖŞÜ]/g, '').length;
        if ((upperCount / cleanLetters.length) >= 0.70) {
            message.delete().catch(() => {});
            message.channel.send(`⚠️ ${message.author}, lütfen büyük harf kullanımını sınırlandırın!`).then(m => setTimeout(() => m.delete().catch(() => {}), 4000));
            return true;
        }
    }

    // 4. Spam Koruması
    const now = Date.now();
    const userSpam = userSpamMap.get(message.author.id) || [];
    const recentMessages = userSpam.filter(t => now - t < 5000);
    recentMessages.push(now);
    userSpamMap.set(message.author.id, recentMessages);

    if (recentMessages.length >= 5) {
        userSpamMap.delete(message.author.id);
        message.delete().catch(() => {});
        message.member.timeout(60 * 1000, "Spam Koruması").catch(() => {});
        message.channel.send(`🛑 ${message.author} aşırı hızlı mesaj attığı için 1 dakika susturuldu.`);
        return true;
    }

    return false;
}

module.exports = { checkSecurityViolations };
