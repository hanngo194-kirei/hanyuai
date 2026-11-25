/* ==========================================================================
   Hanyu AI Pinyin — Kho dữ liệu Giáo trình Nền tảng Phát âm (7 chương · 40 bài)
   Tham chiếu 10 tài liệu Hanyu AI Pinyin; tiến độ tách biệt 100% với Hán ngữ & HSK.
   ========================================================================== */
(function(){
  const PHONEMES = {
    // --- 21 Thanh mẫu (声母) ---
    b:  { id:'b', symbol:'b', kind:'initial', ipa:'[p]', group:'Hai môi', articZone:'lips', asp:false, compareIds:['p'],
          bullets:['Hai môi khép nhẹ rồi mở nhanh tự nhiên.','Không bật luồng hơi mạnh ra ngoài (phát âm gọn).','Phân biệt với p ở độ bật hơi, không phải hữu thanh/vô thanh.'],
          tipVi:'Đặt tờ giấy mỏng trước miệng: đọc b giấy hầu như không rung, đọc p giấy bay rõ.',
          examples:[
            { hanzi:'爸爸', underlying_pinyin:'bàba', spoken_reading:'bàba', meaningVi:'bố, ba' },
            { hanzi:'八', underlying_pinyin:'bā', spoken_reading:'bā', meaningVi:'số tám' },
            { hanzi:'白', underlying_pinyin:'bái', spoken_reading:'bái', meaningVi:'màu trắng' },
            { hanzi:'波', underlying_pinyin:'bō', spoken_reading:'bō', meaningVi:'sóng' }
          ] },
    p:  { id:'p', symbol:'p', kind:'initial', ipa:'[pʰ]', group:'Hai môi', articZone:'lips', asp:true, compareIds:['b'],
          bullets:['Hai môi khép chặt rồi bật mở dứt khoát.','Đẩy luồng hơi bật mạnh từ khoang miệng ra ngoài.','Chú ý giữ bật hơi đều khi ghép với các vần.'],
          tipVi:'Khẩu hình giống b nhưng dồn hơi ở môi rồi bật ph mạnh ra.',
          examples:[
            { hanzi:'朋友', underlying_pinyin:'péngyou', spoken_reading:'péngyou', meaningVi:'bạn bè' },
            { hanzi:'怕', underlying_pinyin:'pà', spoken_reading:'pà', meaningVi:'sợ' },
            { hanzi:'坡', underlying_pinyin:'pō', spoken_reading:'pō', meaningVi:'con dốc' }
          ] },
    m:  { id:'m', symbol:'m', kind:'initial', ipa:'[m]', group:'Hai môi (mũi)', articZone:'nasal', asp:false, compareIds:['n'],
          bullets:['Hai môi khép kín hoàn toàn trong khoảnh khắc đầu.','Luồng hơi thoát qua khoang mũi, tạo âm mũi rõ.','Mở môi sang vần tiếp theo tự nhiên như /m/ tiếng Việt.'],
          tipVi:'Âm mũi hai môi: đặt tay lên mũi sẽ cảm thấy rung nhẹ.',
          examples:[
            { hanzi:'妈妈', underlying_pinyin:'māma', spoken_reading:'māma', meaningVi:'mẹ' },
            { hanzi:'马', underlying_pinyin:'mǎ', spoken_reading:'mǎ', meaningVi:'con ngựa' },
            { hanzi:'米', underlying_pinyin:'mǐ', spoken_reading:'mǐ', meaningVi:'gạo' }
          ] },
    f:  { id:'f', symbol:'f', kind:'initial', ipa:'[f]', group:'Môi – răng', articZone:'labiodental', asp:false, compareIds:['h'],
          bullets:['Răng cửa trên chạm nhẹ lên mặt trong môi dưới.','Thổi luồng hơi xát nhẹ qua khe răng–môi.','Không khép hai môi hoàn toàn như b hoặc p.'],
          tipVi:'Phát âm giống âm /ph/ nhẹ của tiếng Việt, nhớ chạm răng trên vào môi dưới.',
          examples:[
            { hanzi:'飞机', underlying_pinyin:'fēijī', spoken_reading:'fēijī', meaningVi:'máy bay' },
            { hanzi:'饭', underlying_pinyin:'fàn', spoken_reading:'fàn', meaningVi:'cơm' },
            { hanzi:'佛', underlying_pinyin:'fó', spoken_reading:'fó', meaningVi:'Phật' }
          ] },
    d:  { id:'d', symbol:'d', kind:'initial', ipa:'[t]', group:'Đầu lưỡi vùng lợi', articZone:'alveolar', asp:false, compareIds:['t'],
          bullets:['Đầu lưỡi chạm nhẹ vùng lợi ngay sau răng cửa trên.','Thả đầu lưỡi tự nhiên, KHÔNG bật hơi mạnh.','Nghe gần âm /t/ nhẹ không bật gió (tránh đọc thành /đ/).'],
          tipVi:'Chạm đầu lưỡi đúng vùng lợi trên và thả nhanh để âm gọn.',
          examples:[
            { hanzi:'大', underlying_pinyin:'dà', spoken_reading:'dà', meaningVi:'to, lớn' },
            { hanzi:'弟弟', underlying_pinyin:'dìdi', spoken_reading:'dìdi', meaningVi:'em trai' },
            { hanzi:'多', underlying_pinyin:'duō', spoken_reading:'duō', meaningVi:'nhiều' }
          ] },
    t:  { id:'t', symbol:'t', kind:'initial', ipa:'[tʰ]', group:'Đầu lưỡi vùng lợi', articZone:'alveolar', asp:true, compareIds:['d'],
          bullets:['Vị trí đầu lưỡi giống hệt âm d (vùng lợi trên).','Bật luồng hơi mạnh ra ngoài khi tách đầu lưỡi.','Phân biệt rõ độ bật hơi với d.'],
          tipVi:'Đặt lưỡi như d nhưng đẩy luồng hơi mạnh gần /th/ bật gió.',
          examples:[
            { hanzi:'他', underlying_pinyin:'tā', spoken_reading:'tā', meaningVi:'anh ấy' },
            { hanzi:'太', underlying_pinyin:'tài', spoken_reading:'tài', meaningVi:'quá, lắm' },
            { hanzi:'天', underlying_pinyin:'tiān', spoken_reading:'tiān', meaningVi:'trời, ngày' }
          ] },
    n:  { id:'n', symbol:'n', kind:'initial', ipa:'[n]', group:'Đầu lưỡi vùng lợi (mũi)', articZone:'nasal', asp:false, compareIds:['l','m'],
          bullets:['Đầu lưỡi áp kín vào vùng lợi trên để chặn khí đường miệng.','Luồng khí đi lên thoát qua khoang mũi.','Hạ lưỡi dứt khoát khi chuyển sang vận mẫu.'],
          tipVi:'Bịt nhẹ mũi thử đọc: âm n sẽ bị nghẹt rõ rệt, còn âm l vẫn thoát hơi bình thường.',
          examples:[
            { hanzi:'你', underlying_pinyin:'nǐ', spoken_reading:'nǐ', meaningVi:'bạn' },
            { hanzi:'男', underlying_pinyin:'nán', spoken_reading:'nán', meaningVi:'nam giới' },
            { hanzi:'女', underlying_pinyin:'nǚ', spoken_reading:'nǚ', meaningVi:'nữ giới' }
          ] },
    l:  { id:'l', symbol:'l', kind:'initial', ipa:'[l]', group:'Đầu lưỡi vùng lợi (âm bên)', articZone:'alveolar', asp:false, compareIds:['n','r'],
          bullets:['Đầu lưỡi chạm giữa vùng lợi trên.','Luồng hơi thoát ra hai bên mép lưỡi (âm bên).','Không đẩy khí qua mũi như âm n.'],
          tipVi:'Chạm đầu lưỡi gọn rồi buông nhanh, giữ luồng hơi đi qua hai bên cạnh lưỡi.',
          examples:[
            { hanzi:'老师', underlying_pinyin:'lǎoshī', spoken_reading:'lǎoshī', meaningVi:'giáo viên' },
            { hanzi:'来', underlying_pinyin:'lái', spoken_reading:'lái', meaningVi:'đến' },
            { hanzi:'绿', underlying_pinyin:'lǜ', spoken_reading:'lǜ', meaningVi:'xanh lá' }
          ] },
    g:  { id:'g', symbol:'g', kind:'initial', ipa:'[k]', group:'Gốc lưỡi – ngạc mềm', articZone:'velar', asp:false, compareIds:['k'],
          bullets:['Phần gốc (sau) lưỡi nâng lên chạm ngạc mềm phía sau.','Buông nhẹ gốc lưỡi để mở hơi, KHÔNG bật hơi mạnh.','Âm gần /c/ nhẹ tiếng Việt (không đọc rung thành /g/ tiếng Anh).'],
          tipVi:'Giữ đầu lưỡi hạ thấp, chỉ dùng gốc lưỡi đóng–mở gọn ở ngạc mềm.',
          examples:[
            { hanzi:'哥哥', underlying_pinyin:'gēge', spoken_reading:'gēge', meaningVi:'anh trai' },
            { hanzi:'高', underlying_pinyin:'gāo', spoken_reading:'gāo', meaningVi:'cao' },
            { hanzi:'国', underlying_pinyin:'guó', spoken_reading:'guó', meaningVi:'đất nước' }
          ] },
    k:  { id:'k', symbol:'k', kind:'initial', ipa:'[kʰ]', group:'Gốc lưỡi – ngạc mềm', articZone:'velar', asp:true, compareIds:['g'],
          bullets:['Vị trí gốc lưỡi giống g (chạm ngạc mềm).','Bật luồng hơi mạnh dứt khoát từ cuống họng ra ngoài.','Không kéo dài xát như âm h.'],
          tipVi:'Nén hơi nhẹ sau gốc lưỡi rồi bật mạnh dứt khoát.',
          examples:[
            { hanzi:'看', underlying_pinyin:'kàn', spoken_reading:'kàn', meaningVi:'nhìn, xem' },
            { hanzi:'口', underlying_pinyin:'kǒu', spoken_reading:'kǒu', meaningVi:'miệng' },
            { hanzi:'快', underlying_pinyin:'kuài', spoken_reading:'kuài', meaningVi:'nhanh' }
          ] },
    h:  { id:'h', symbol:'h', kind:'initial', ipa:'[x]~[h]', group:'Gốc lưỡi – ngạc mềm', articZone:'velar', asp:false, compareIds:['f'],
          bullets:['Gốc lưỡi nâng gần ngạc mềm tạo khe hẹp (không đóng kín).','Đẩy luồng hơi xát nhẹ ở vùng sau khoang miệng.','Nằm giữa /h/ và /kh/ nhẹ của tiếng Việt.'],
          tipVi:'Tránh khạc quá nặng hoặc quá yếu; giữ luồng hơi ấm ma sát nhẹ ở phía sau.',
          examples:[
            { hanzi:'好', underlying_pinyin:'hǎo', spoken_reading:'hǎo', meaningVi:'tốt, khỏe' },
            { hanzi:'喝', underlying_pinyin:'hē', spoken_reading:'hē', meaningVi:'uống' },
            { hanzi:'汉语', underlying_pinyin:'Hànyǔ', spoken_reading:'Hànyǔ', meaningVi:'tiếng Hán' }
          ] },
    j:  { id:'j', symbol:'j', kind:'initial', ipa:'[tɕ]', group:'Mặt lưỡi trước – ngạc cứng', articZone:'palatal', asp:false, compareIds:['q','zh'],
          bullets:['Mặt trước lưỡi áp sát lên ngạc cứng, đầu lưỡi đặt sau răng dưới.','Tắc–xát nhẹ, KHÔNG bật hơi mạnh.','Chỉ ghép được với vần bắt đầu bằng i hoặc ü (viết là u).'],
          tipVi:'Giữ đầu lưỡi ở dưới, mặt lưỡi nâng chạm vòm cứng; nghe gọn gần /ch/ nhẹ.',
          examples:[
            { hanzi:'家', underlying_pinyin:'jiā', spoken_reading:'jiā', meaningVi:'nhà, gia đình' },
            { hanzi:'几', underlying_pinyin:'jǐ', spoken_reading:'jǐ', meaningVi:'mấy' },
            { hanzi:'去', underlying_pinyin:'qù', spoken_reading:'qù', meaningVi:'đi (đối chiếu q)' }
          ] },
    q:  { id:'q', symbol:'q', kind:'initial', ipa:'[tɕʰ]', group:'Mặt lưỡi trước – ngạc cứng', articZone:'palatal', asp:true, compareIds:['j','ch'],
          bullets:['Vị trí mặt lưỡi giống hệt j (tắc–xát mặt lưỡi trước).','BẬT HƠI MẠNH tạo luồng gió xì rõ nét.','Khác ch ở chỗ mặt lưỡi đặt thẳng phía trước, không quặt đầu lưỡi.'],
          tipVi:'Đặt lưỡi ở vị trí j rồi bật hơi mạnh kéo nhẹ tiếng xì sắc.',
          examples:[
            { hanzi:'去', underlying_pinyin:'qù', spoken_reading:'qù', meaningVi:'đi' },
            { hanzi:'请', underlying_pinyin:'qǐng', spoken_reading:'qǐng', meaningVi:'mời, xin' },
            { hanzi:'七', underlying_pinyin:'qī', spoken_reading:'qī', meaningVi:'số bảy' }
          ] },
    x:  { id:'x', symbol:'x', kind:'initial', ipa:'[ɕ]', group:'Mặt lưỡi trước – ngạc cứng', articZone:'palatal', asp:false, compareIds:['sh','s'],
          bullets:['Mặt trước lưỡi nâng gần ngạc cứng tạo khe hẹp (không chạm hẳn).','Thổi luồng hơi xát mảnh và dịu qua khe hẹp.','Không uốn đầu lưỡi như sh.'],
          tipVi:'Mỉm nhẹ khóe miệng, đặt mặt lưỡi gần ngạc cứng và thổi gió êm như /x/ tiếng Việt.',
          examples:[
            { hanzi:'谢谢', underlying_pinyin:'xièxie', spoken_reading:'xièxie', meaningVi:'cảm ơn' },
            { hanzi:'小', underlying_pinyin:'xiǎo', spoken_reading:'xiǎo', meaningVi:'nhỏ' },
            { hanzi:'西', underlying_pinyin:'xī', spoken_reading:'xī', meaningVi:'hướng tây' }
          ] },
    zh: { id:'zh', symbol:'zh', kind:'initial', ipa:'[ʈʂ]', group:'Quặt lưỡi – sau lợi', articZone:'retroflex', asp:false, compareIds:['z','j'],
          bullets:['Đầu lưỡi cong lên phía sau vùng lợi (không cuộn quá sâu).','Tạo âm tắc–xát gọn, KHÔNG bật hơi mạnh.','Phân biệt với z (đầu lưỡi ở phía trước sau răng trên).'],
          tipVi:'Nghe và đối chiếu zhī – zī, chú ý đưa đầu lưỡi lùi về sau vùng lợi.',
          examples:[
            { hanzi:'知道', underlying_pinyin:'zhīdào', spoken_reading:'zhīdào', meaningVi:'biết, hiểu' },
            { hanzi:'中国', underlying_pinyin:'Zhōngguó', spoken_reading:'Zhōngguó', meaningVi:'Trung Quốc' },
            { hanzi:'住', underlying_pinyin:'zhù', spoken_reading:'zhù', meaningVi:'ở, cư trú' }
          ] },
    ch: { id:'ch', symbol:'ch', kind:'initial', ipa:'[ʈʂʰ]', group:'Quặt lưỡi – sau lợi', articZone:'retroflex', asp:true, compareIds:['c','q'],
          bullets:['Đầu lưỡi cong chạm vùng sau lợi giống hệt zh.','BẬT HƠI MẠNH luồng gió ra ngoài.','Phân biệt với c (đầu lưỡi thẳng phía trước) và q (mặt lưỡi).'],
          tipVi:'Uốn đầu lưỡi giống zh nhưng đẩy hơi bật mạnh rõ ràng.',
          examples:[
            { hanzi:'吃', underlying_pinyin:'chī', spoken_reading:'chī', meaningVi:'ăn' },
            { hanzi:'茶', underlying_pinyin:'chá', spoken_reading:'chá', meaningVi:'trà' },
            { hanzi:'车', underlying_pinyin:'chē', spoken_reading:'chē', meaningVi:'xe' }
          ] },
    sh: { id:'sh', symbol:'sh', kind:'initial', ipa:'[ʂ]', group:'Quặt lưỡi – sau lợi', articZone:'retroflex', asp:false, compareIds:['s','x'],
          bullets:['Đầu lưỡi uốn nhẹ lên gần vùng sau lợi tạo khe hẹp.','Thổi luồng hơi xát trầm và đều (không tắc lại trước khi thổi).','Âm dày và trầm hơn hẳn so với s và x.'],
          tipVi:'Giữ đầu lưỡi nâng sau vùng lợi và thổi hơi đều không ngắt.',
          examples:[
            { hanzi:'书', underlying_pinyin:'shū', spoken_reading:'shū', meaningVi:'sách' },
            { hanzi:'是', underlying_pinyin:'shì', spoken_reading:'shì', meaningVi:'là' },
            { hanzi:'老师', underlying_pinyin:'lǎoshī', spoken_reading:'lǎoshī', meaningVi:'giáo viên' }
          ] },
    r:  { id:'r', symbol:'r', kind:'initial', ipa:'[ɻ]~[ʐ]', group:'Quặt lưỡi – sau lợi (hữu thanh)', articZone:'retroflex', asp:false, compareIds:['l','sh'],
          bullets:['Đầu lưỡi cong lên gần vùng sau lợi giống vị trí sh.','Dây thanh quản rung nhẹ (hữu thanh), KHÔNG rung lẩy bẩy đầu lưỡi như /r/ Việt.','Phân biệt với l (lưỡi hạ chạm vùng lợi trước và thoát hơi hai bên).'],
          tipVi:'Đặt lưỡi ở đúng chỗ sh nhưng phát ra tiếng rung êm ở cổ họng.',
          examples:[
            { hanzi:'人', underlying_pinyin:'rén', spoken_reading:'rén', meaningVi:'người' },
            { hanzi:'热', underlying_pinyin:'rè', spoken_reading:'rè', meaningVi:'nóng' },
            { hanzi:'日', underlying_pinyin:'rì', spoken_reading:'rì', meaningVi:'ngày, mặt trời' }
          ] },
    z:  { id:'z', symbol:'z', kind:'initial', ipa:'[ts]', group:'Đầu lưỡi trước', articZone:'dental', asp:false, compareIds:['zh','c'],
          bullets:['Đầu lưỡi thẳng chạm nhẹ mặt sau răng cửa trên.','Tắc–xát nhẹ, KHÔNG bật hơi mạnh.','Đầu lưỡi thẳng ở phía trước, khác hoàn toàn zh cong lưỡi.'],
          tipVi:'Thẳng lưỡi chạm sau răng cửa trên, buông nhẹ nghe gọn gần /ch-x/ nhẹ.',
          examples:[
            { hanzi:'再见', underlying_pinyin:'zàijiàn', spoken_reading:'zàijiàn', meaningVi:'tạm biệt' },
            { hanzi:'早', underlying_pinyin:'zǎo', spoken_reading:'zǎo', meaningVi:'sớm' },
            { hanzi:'字', underlying_pinyin:'zì', spoken_reading:'zì', meaningVi:'chữ' }
          ] },
    c:  { id:'c', symbol:'c', kind:'initial', ipa:'[tsʰ]', group:'Đầu lưỡi trước', articZone:'dental', asp:true, compareIds:['z','ch'],
          bullets:['Vị trí đầu lưỡi thẳng sau răng cửa trên giống z.','BẬT HƠI MẠNH tạo âm tắc–xát sắc nét (/ts/ bật gió).','Phân biệt với ch (uốn đầu lưỡi về sau vùng lợi).'],
          tipVi:'Đặt lưỡi ngay sau răng trên như z rồi bật gió thật sắc.',
          examples:[
            { hanzi:'菜', underlying_pinyin:'cài', spoken_reading:'cài', meaningVi:'món ăn, rau' },
            { hanzi:'草', underlying_pinyin:'cǎo', spoken_reading:'cǎo', meaningVi:'cỏ' },
            { hanzi:'次', underlying_pinyin:'cì', spoken_reading:'cì', meaningVi:'lần' }
          ] },
    s:  { id:'s', symbol:'s', kind:'initial', ipa:'[s]', group:'Đầu lưỡi trước', articZone:'dental', asp:false, compareIds:['sh','x'],
          bullets:['Đầu lưỡi thẳng đặt gần mặt sau răng cửa trên tạo khe hẹp.','Thổi luồng hơi xát mảnh và sắc (gần /x/ tiếng Việt).','Không uốn đầu lưỡi về sau như sh.'],
          tipVi:'Thư giãn lưỡi ở vị trí thẳng phía trước và thổi luồng hơi mảnh đều.',
          examples:[
            { hanzi:'三', underlying_pinyin:'sān', spoken_reading:'sān', meaningVi:'số ba' },
            { hanzi:'四', underlying_pinyin:'sì', spoken_reading:'sì', meaningVi:'số bốn' },
            { hanzi:'思', underlying_pinyin:'sī', spoken_reading:'sī', meaningVi:'suy nghĩ' }
          ] },

    // --- Vận mẫu (韵母) ---
    a:   { id:'a', symbol:'a', kind:'final', ipa:'[a]', group:'Vận mẫu đơn', articZone:'vowel_open', asp:false, compareIds:['o','e'],
           bullets:['Mở rộng miệng theo chiều dọc, môi tự nhiên không chu.','Lưỡi đặt thấp ở đáy khoang miệng.','Phát âm vang rõ như /a/ tiếng Việt.'],
           tipVi:'Giữ hàm mở thoáng và ổn định suốt khi kéo dài âm.',
           examples:[{ hanzi:'爸', underlying_pinyin:'bà', spoken_reading:'bà', meaningVi:'bố' },{ hanzi:'大', underlying_pinyin:'dà', spoken_reading:'dà', meaningVi:'to, lớn' },{ hanzi:'马', underlying_pinyin:'mǎ', spoken_reading:'mǎ', meaningVi:'con ngựa' }] },
    o:   { id:'o', symbol:'o', kind:'final', ipa:'[o]~[uo]', group:'Vận mẫu đơn', articZone:'vowel_round', asp:false, compareIds:['e','a'],
           bullets:['Môi chu tròn vừa, lưỡi nâng lên ở phần sau.','Phát âm thay đổi nhẹ tùy thanh mẫu đi kèm (sau b/p/m/f hơi có độ lướt uo nhẹ).','Giữ khẩu hình tròn từ đầu đến cuối âm.'],
           tipVi:'Không dẹt môi về hai bên; giữ môi tròn gọn như chữ /ô/ thoáng.',
           examples:[{ hanzi:'我', underlying_pinyin:'wǒ', spoken_reading:'wǒ', meaningVi:'tôi' },{ hanzi:'波', underlying_pinyin:'bō', spoken_reading:'bō', meaningVi:'sóng' },{ hanzi:'佛', underlying_pinyin:'fó', spoken_reading:'fó', meaningVi:'Phật' }] },
    e:   { id:'e', symbol:'e', kind:'final', ipa:'[ɤ]', group:'Vận mẫu đơn', articZone:'vowel_back', asp:false, compareIds:['o','a'],
           bullets:['Nguyên âm hàng sau KHÔNG tròn môi (khác hẳn /e/ tiếng Việt).','Khóe miệng hơi kéo nhẹ sang hai bên, gốc lưỡi lùi sau.','Âm nghe gần giữa /ơ/ và /ư/.'],
           tipVi:'Đọc thử /ơ/ nhưng kéo lùi lưỡi nhẹ về cuống họng và giữ môi không tròn.',
           examples:[{ hanzi:'喝', underlying_pinyin:'hē', spoken_reading:'hē', meaningVi:'uống' },{ hanzi:'车', underlying_pinyin:'chē', spoken_reading:'chē', meaningVi:'xe' },{ hanzi:'热', underlying_pinyin:'rè', spoken_reading:'rè', meaningVi:'nóng' }] },
    i:   { id:'i', symbol:'i', kind:'final', ipa:'[i] / [ɿ] / [ʅ]', group:'Vận mẫu đơn', articZone:'vowel_front', asp:false, compareIds:['ü','u'],
           bullets:['Mặt lưỡi nâng cao phía trước, khóe miệng dẹt tự nhiên (như /i/).','ĐẶC BIỆT: Sau zi/ci/si và zhi/chi/shi/ri, i không đọc là /i/ mà là âm đầu lưỡi/quặt lưỡi kéo dài.','Khi đứng một mình viết thành yi.'],
           tipVi:'Phân biệt rõ: mi (đọc /i/) khác hoàn toàn với si và shi.',
           examples:[{ hanzi:'你', underlying_pinyin:'nǐ', spoken_reading:'nǐ', meaningVi:'bạn' },{ hanzi:'一', underlying_pinyin:'yī', spoken_reading:'yī', meaningVi:'số một' },{ hanzi:'知道', underlying_pinyin:'zhīdào', spoken_reading:'zhīdào', meaningVi:'biết' }] },
    u:   { id:'u', symbol:'u', kind:'final', ipa:'[u]', group:'Vận mẫu đơn', articZone:'vowel_round', asp:false, compareIds:['ü','o'],
           bullets:['Gốc lưỡi nâng cao ở phía sau khoang miệng.','Môi chu tròn nhỏ nhô ra trước.','Khi đứng một mình viết thành wu.'],
           tipVi:'Lưỡi lùi cao ở phía sau trong khi môi chu tròn nhỏ.',
           examples:[{ hanzi:'书', underlying_pinyin:'shū', spoken_reading:'shū', meaningVi:'sách' },{ hanzi:'五', underlying_pinyin:'wǔ', spoken_reading:'wǔ', meaningVi:'số năm' },{ hanzi:'路', underlying_pinyin:'lù', spoken_reading:'lù', meaningVi:'con đường' }] },
    ü:   { id:'ü', symbol:'ü', kind:'final', ipa:'[y]', group:'Vận mẫu đơn', articZone:'vowel_front', asp:false, compareIds:['u','i'],
           bullets:['Lưỡi nâng cao ở phía TRƯỚC giống vị trí phát âm i.','Môi lại CHU TRÒN giống vị trí phát âm u.','Sau j, q, x, y bỏ hai dấu chấm (ju/qu/xu/yu); sau n, l phải giữ ü (nü/lü).'],
           tipVi:'Cách luyện chuẩn: đọc kéo dài âm /i/ trước, sau đó giữ nguyên vị trí lưỡi rồi chu tròn môi lại.',
           examples:[{ hanzi:'女', underlying_pinyin:'nǚ', spoken_reading:'nǚ', meaningVi:'nữ, phụ nữ' },{ hanzi:'绿', underlying_pinyin:'lǜ', spoken_reading:'lǜ', meaningVi:'màu xanh lá' },{ hanzi:'去', underlying_pinyin:'qù', spoken_reading:'qù', meaningVi:'đi' }] },
    ai:  { id:'ai', symbol:'ai', kind:'final', ipa:'[aɪ]', group:'Vận mẫu kép', articZone:'vowel_open', asp:false, compareIds:['ei'],
           bullets:['Bắt đầu bằng /a/ mở rộng rồi trượt nhanh sang /i/.','Âm đầu rõ và dài hơn âm cuối.'],
           tipVi:'Chuyển khẩu hình mượt từ mở rộng sang dẹt nhẹ.',
           examples:[{ hanzi:'白', underlying_pinyin:'bái', spoken_reading:'bái', meaningVi:'trắng' },{ hanzi:'爱', underlying_pinyin:'ài', spoken_reading:'ài', meaningVi:'yêu thích' }] },
    ei:  { id:'ei', symbol:'ei', kind:'final', ipa:'[eɪ]', group:'Vận mẫu kép', articZone:'vowel_front', asp:false, compareIds:['ai'],
           bullets:['Bắt đầu bằng /ê/ hơi mở rồi khép nâng sang /i/.','Gần âm /ây/ nhẹ nhưng mở rõ hơn một chút.'],
           tipVi:'Không đọc thành /ê-i/ tách rời; trượt liền thành một âm tiết.',
           examples:[{ hanzi:'妹妹', underlying_pinyin:'mèimei', spoken_reading:'mèimei', meaningVi:'em gái' },{ hanzi:'杯', underlying_pinyin:'bēi', spoken_reading:'bēi', meaningVi:'cái cốc' }] },
    ao:  { id:'ao', symbol:'ao', kind:'final', ipa:'[ɑʊ]', group:'Vận mẫu kép', articZone:'vowel_open', asp:false, compareIds:['ou'],
           bullets:['Bắt đầu mở miệng ở /a/ sâu rồi khép tròn môi về /u/.','Âm cuối nghiêng về /u/ chứ không dừng ở /o/.'],
           tipVi:'Kết thúc hơi tròn môi về hướng /au/ gọn.',
           examples:[{ hanzi:'好', underlying_pinyin:'hǎo', spoken_reading:'hǎo', meaningVi:'tốt' },{ hanzi:'早', underlying_pinyin:'zǎo', spoken_reading:'zǎo', meaningVi:'sớm' }] },
    ou:  { id:'ou', symbol:'ou', kind:'final', ipa:'[oʊ]', group:'Vận mẫu kép', articZone:'vowel_round', asp:false, compareIds:['ao'],
           bullets:['Bắt đầu bằng /ô/ tròn môi rồi thu gọn thêm về /u/.','Giống /âu/ tròn môi hơn, không để miệng dẹt.'],
           tipVi:'Giữ môi tròn ngay từ đầu âm tiết và thu gọn ở cuối.',
           examples:[{ hanzi:'口', underlying_pinyin:'kǒu', spoken_reading:'kǒu', meaningVi:'miệng' },{ hanzi:'走', underlying_pinyin:'zǒu', spoken_reading:'zǒu', meaningVi:'đi bộ' }] },
    ia:  { id:'ia', symbol:'ia', kind:'final', ipa:'[ia]', group:'Vận mẫu ghép i-', articZone:'vowel_front', asp:false, compareIds:['ie'],
           bullets:['Lướt nhanh qua /i/ làm giới âm rồi mở sang /a/.','Khi không có thanh mẫu viết thành ya.'],
           tipVi:'Âm /i/ chỉ lướt ngắn, trọng tâm rơi vào nguyên âm /a/.',
           examples:[{ hanzi:'家', underlying_pinyin:'jiā', spoken_reading:'jiā', meaningVi:'nhà' },{ hanzi:'下', underlying_pinyin:'xià', spoken_reading:'xià', meaningVi:'dưới, xuống' }] },
    ie:  { id:'ie', symbol:'ie', kind:'final', ipa:'[iɛ]', group:'Vận mẫu ghép i-', articZone:'vowel_front', asp:false, compareIds:['üe'],
           bullets:['Lướt nhanh từ /i/ sang /ê/ hơi mở.','Khi không có thanh mẫu viết thành ye.'],
           tipVi:'Đọc nhẹ âm cuối gần /iê/, không đóng quá chặt.',
           examples:[{ hanzi:'谢谢', underlying_pinyin:'xièxie', spoken_reading:'xièxie', meaningVi:'cảm ơn' },{ hanzi:'姐', underlying_pinyin:'jiě', spoken_reading:'jiě', meaningVi:'chị gái' }] },
    iao: { id:'iao', symbol:'iao', kind:'final', ipa:'[iɑʊ]', group:'Vận mẫu ghép i-', articZone:'vowel_open', asp:false, compareIds:['iu'],
           bullets:['Trượt liên tục từ /i/ sang /ao/ trong một hơi.','Khi đứng một mình viết thành yao.'],
           tipVi:'Giữ /a/ sáng rõ ở giữa rồi thu tròn môi ở cuối.',
           examples:[{ hanzi:'小', underlying_pinyin:'xiǎo', spoken_reading:'xiǎo', meaningVi:'nhỏ' },{ hanzi:'叫', underlying_pinyin:'jiào', spoken_reading:'jiào', meaningVi:'gọi là' }] },
    iu:  { id:'iu', symbol:'iu (iou)', kind:'final', ipa:'[ioʊ]', group:'Vận mẫu ghép i-', articZone:'vowel_round', asp:false, compareIds:['ui','iao'],
           bullets:['Dạng viết rút gọn của iou khi đi sau thanh mẫu (ví dụ liù, chứ không viết liou).','Vẫn giữ âm đệm ở giữa /i-ô-u/ chứ không đọc gọn thành /iu/ phẳng.','Dấu thanh luôn đánh trên nguyên âm u đứng sau (liù, jiǔ).'],
           tipVi:'Nhớ quy tắc chính tả: iou sau thanh mẫu → iu, dấu thanh đặt ở u.',
           examples:[{ hanzi:'六', underlying_pinyin:'liù', spoken_reading:'liù', meaningVi:'số sáu' },{ hanzi:'九', underlying_pinyin:'jiǔ', spoken_reading:'jiǔ', meaningVi:'số chín' }] },
    ua:  { id:'ua', symbol:'ua', kind:'final', ipa:'[ua]', group:'Vận mẫu ghép u-', articZone:'vowel_round', asp:false, compareIds:['uo'],
           bullets:['Chu môi /u/ lướt nhanh rồi mở rộng sang /a/.','Khi đứng độc lập viết thành wa.'],
           tipVi:'Khởi đầu tròn môi /u/ rõ rồi mở rộng hàm ở /a/.',
           examples:[{ hanzi:'花', underlying_pinyin:'huā', spoken_reading:'huā', meaningVi:'hoa' },{ hanzi:'画', underlying_pinyin:'huà', spoken_reading:'huà', meaningVi:'vẽ, bức tranh' }] },
    uo:  { id:'uo', symbol:'uo', kind:'final', ipa:'[uo]', group:'Vận mẫu ghép u-', articZone:'vowel_round', asp:false, compareIds:['o','ua'],
           bullets:['Lướt nhanh từ /u/ sang /ô/ hơi mở.','Khi đứng một mình viết thành wo.'],
           tipVi:'Giữ khẩu hình tròn môi xuyên suốt giữa /u/ và /o/.',
           examples:[{ hanzi:'我', underlying_pinyin:'wǒ', spoken_reading:'wǒ', meaningVi:'tôi' },{ hanzi:'国', underlying_pinyin:'guó', spoken_reading:'guó', meaningVi:'quốc gia' }] },
    uai: { id:'uai', symbol:'uai', kind:'final', ipa:'[uaɪ]', group:'Vận mẫu ghép u-', articZone:'vowel_open', asp:false, compareIds:['ui'],
           bullets:['Chu môi /u/ rồi mở sang /a/ và khép lên /i/ (/oai/).','Khi đứng một mình viết thành wai.'],
           tipVi:'Chuyển 3 bước liền hơi u → a → i.',
           examples:[{ hanzi:'快', underlying_pinyin:'kuài', spoken_reading:'kuài', meaningVi:'nhanh' },{ hanzi:'外', underlying_pinyin:'wài', spoken_reading:'wài', meaningVi:'bên ngoài' }] },
    ui:  { id:'ui', symbol:'ui (uei)', kind:'final', ipa:'[ueɪ]', group:'Vận mẫu ghép u-', articZone:'vowel_round', asp:false, compareIds:['iu','uai'],
           bullets:['Dạng viết rút gọn của uei sau thanh mẫu (ví dụ guì, không viết guei).','Đọc đầy đủ có độ chuyển /u-ê-i/ (nhất là ở thanh 3/4).','Dấu thanh luôn đánh trên nguyên âm i đứng sau (guì, shuǐ).'],
           tipVi:'Nhớ chính tả: uei sau thanh mẫu viết thành ui và đánh dấu ở chữ i.',
           examples:[{ hanzi:'水', underlying_pinyin:'shuǐ', spoken_reading:'shuǐ', meaningVi:'nước' },{ hanzi:'贵', underlying_pinyin:'guì', spoken_reading:'guì', meaningVi:'đắt, quý' }] },
    üe:  { id:'üe', symbol:'üe', kind:'final', ipa:'[yɛ]', group:'Vận mẫu ghép ü-', articZone:'vowel_front', asp:false, compareIds:['ie','ü'],
           bullets:['Bắt đầu bằng /ü/ tròn môi hàng trước rồi mở sang /ê/.','Sau j/q/x/y bỏ dấu chấm viết là jue/que/xue/yue; sau n/l giữ ü (nüe/lüe).'],
           tipVi:'Nhớ giữ môi tròn ở phần đầu âm ü trước khi mở sang e.',
           examples:[{ hanzi:'月', underlying_pinyin:'yuè', spoken_reading:'yuè', meaningVi:'tháng, mặt trăng' },{ hanzi:'学', underlying_pinyin:'xué', spoken_reading:'xué', meaningVi:'học' }] },
    an:  { id:'an', symbol:'an', kind:'final', ipa:'[an]', group:'Âm mũi -n', articZone:'alveolar', asp:false, compareIds:['ang'],
           bullets:['Đọc nguyên âm /a/ rồi nâng đầu lưỡi chạm lợi trên để kết thúc mũi /-n/.','Âm mở nhẹ, gọn, không bị vang sâu ở cuống họng.'],
           tipVi:'Kết thúc câu chữ: đầu lưỡi phải chạm vào lợi sau răng cửa trên.',
           examples:[{ hanzi:'看', underlying_pinyin:'kàn', spoken_reading:'kàn', meaningVi:'xem' },{ hanzi:'三', underlying_pinyin:'sān', spoken_reading:'sān', meaningVi:'số ba' }] },
    en:  { id:'en', symbol:'en', kind:'final', ipa:'[ən]', group:'Âm mũi -n', articZone:'alveolar', asp:false, compareIds:['eng'],
           bullets:['Đọc /ơ/ ngắn rồi nâng đầu lưỡi chạm lợi trên kết thúc /-n/.','Âm gọn gần /ân/, không kéo dài như -eng.'],
           tipVi:'Giữ đầu lưỡi kết thúc phía trước (vùng lợi), không tụt gốc lưỡi về sau.',
           examples:[{ hanzi:'很', underlying_pinyin:'hěn', spoken_reading:'hěn', meaningVi:'rất' },{ hanzi:'人', underlying_pinyin:'rén', spoken_reading:'rén', meaningVi:'người' }] },
    in:  { id:'in', symbol:'in', kind:'final', ipa:'[in]', group:'Âm mũi -n', articZone:'alveolar', asp:false, compareIds:['ing'],
           bullets:['Đọc /i/ rồi khép đầu lưỡi lên lợi trên đóng âm mũi /-n/.','Không có âm chuyển ở giữa; âm thanh sắc gọn phía trước.'],
           tipVi:'Phân biệt in (-n đầu lưỡi) với ing (-ng cuống lưỡi).',
           examples:[{ hanzi:'新', underlying_pinyin:'xīn', spoken_reading:'xīn', meaningVi:'mới' },{ hanzi:'您', underlying_pinyin:'nín', spoken_reading:'nín', meaningVi:'ngài, ông/bà' }] },
    un:  { id:'un', symbol:'un (uen)', kind:'final', ipa:'[uən]', group:'Âm mũi -n', articZone:'alveolar', asp:false, compareIds:['ün'],
           bullets:['Dạng rút gọn của uen khi ghép sau thanh mẫu (ví dụ lún).','Sau j/q/x viết thành jun/qun/xun (thực chất là ün).'],
           tipVi:'Chu môi đọc /u-ơn/, kết thúc đầu lưỡi chạm lợi trên.',
           examples:[{ hanzi:'问', underlying_pinyin:'wèn', spoken_reading:'wèn', meaningVi:'hỏi' },{ hanzi:'春', underlying_pinyin:'chūn', spoken_reading:'chūn', meaningVi:'mùa xuân' }] },
    ün:  { id:'ün', symbol:'ün', kind:'final', ipa:'[yn]', group:'Âm mũi -n', articZone:'vowel_front', asp:false, compareIds:['un','ü'],
           bullets:['Đọc âm /ü/ tròn môi phía trước rồi kết thúc mũi đầu lưỡi /-n/.','Sau j/q/x/y viết bỏ hai dấu chấm (jun, qun, xun, yun).'],
           tipVi:'Giữ chất /ü/ trước khi đưa đầu lưỡi lên đóng /-n/.',
           examples:[{ hanzi:'云', underlying_pinyin:'yún', spoken_reading:'yún', meaningVi:'mây' },{ hanzi:'军', underlying_pinyin:'jūn', spoken_reading:'jūn', meaningVi:'quân đội' }] },
    ian: { id:'ian', symbol:'ian', kind:'final', ipa:'[iɛn]', group:'Âm mũi -n', articZone:'alveolar', asp:false, compareIds:['iang'],
           bullets:['Âm giữa đọc nghiêng về /ê/ mở (gần /iên/, không bẹt rộng thành /ian/).','Kết thúc đầu lưỡi chạm lợi trên /-n/.'],
           tipVi:'Đọc gần /iên/ thanh gọn thay vì /i-an/ quá mở.',
           examples:[{ hanzi:'天', underlying_pinyin:'tiān', spoken_reading:'tiān', meaningVi:'trời, ngày' },{ hanzi:'见', underlying_pinyin:'jiàn', spoken_reading:'jiàn', meaningVi:'gặp' }] },
    uan: { id:'uan', symbol:'uan', kind:'final', ipa:'[uan]', group:'Âm mũi -n', articZone:'alveolar', asp:false, compareIds:['uang'],
           bullets:['Chu môi /u/ mở sang /an/ (trừ sau j/q/x/y là üan đọc gần /uyên/).','Kết thúc đầu lưỡi chạm vùng lợi trên.'],
           tipVi:'Lưu ý sau j/q/x/y thì uan thực chất là üan.',
           examples:[{ hanzi:'关', underlying_pinyin:'guān', spoken_reading:'guān', meaningVi:'đóng' },{ hanzi:'远', underlying_pinyin:'yuǎn', spoken_reading:'yuǎn', meaningVi:'xa (üan)' }] },
    üan: { id:'üan', symbol:'üan', kind:'final', ipa:'[yɛn]', group:'Âm mũi -n', articZone:'vowel_front', asp:false, compareIds:['uan'],
           bullets:['Chu môi /ü/ rồi trượt sang /en/ (gần /uyên/).','Sau j/q/x/y bỏ dấu chấm viết là juan/quan/xuan/yuan.'],
           tipVi:'Môi bắt đầu tròn của ü, kết thúc mũi -n đầu lưỡi.',
           examples:[{ hanzi:'远', underlying_pinyin:'yuǎn', spoken_reading:'yuǎn', meaningVi:'xa' },{ hanzi:'全', underlying_pinyin:'quán', spoken_reading:'quán', meaningVi:'toàn bộ' }] },
    ang: { id:'ang', symbol:'ang', kind:'final', ipa:'[ɑŋ]', group:'Âm mũi -ng', articZone:'velar', asp:false, compareIds:['an'],
           bullets:['Mở rộng miệng ở phần sau (/a/ trầm) rồi nâng gốc lưỡi chạm ngạc mềm đóng /-ng/.','Âm vang sâu ở khoang mũi sau, đầu lưỡi giữ ở dưới.'],
           tipVi:'Đầu lưỡi KHÔNG chạm lợi trên như an; giữ lưỡi hạ thấp và đẩy gốc lưỡi lên.',
           examples:[{ hanzi:'忙', underlying_pinyin:'máng', spoken_reading:'máng', meaningVi:'bận' },{ hanzi:'方', underlying_pinyin:'fāng', spoken_reading:'fāng', meaningVi:'phương hướng' }] },
    eng: { id:'eng', symbol:'eng', kind:'final', ipa:'[əŋ]', group:'Âm mũi -ng', articZone:'velar', asp:false, compareIds:['en'],
           bullets:['Đọc /ơ/ ngắn rồi nâng gốc lưỡi lên ngạc mềm đóng âm mũi sau /-ng/.','Âm vang dày và dài hơn hẳn so với en.'],
           tipVi:'Phân biệt en (kết thúc đầu lưỡi) và eng (kết thúc gốc lưỡi).',
           examples:[{ hanzi:'朋友', underlying_pinyin:'péngyou', spoken_reading:'péngyou', meaningVi:'bạn bè' },{ hanzi:'风', underlying_pinyin:'fēng', spoken_reading:'fēng', meaningVi:'gió' }] },
    ing: { id:'ing', symbol:'ing', kind:'final', ipa:'[iŋ]', group:'Âm mũi -ng', articZone:'velar', asp:false, compareIds:['in'],
           bullets:['Đọc /i/ rồi đưa gốc lưỡi lên đóng ngạc mềm /-ng/ (/i-ng/).','Không để đầu lưỡi chạm lợi trên như in.'],
           tipVi:'Cảm nhận độ vang phía sau cuống họng ở phần kết -ng.',
           examples:[{ hanzi:'听', underlying_pinyin:'tīng', spoken_reading:'tīng', meaningVi:'nghe' },{ hanzi:'明', underlying_pinyin:'míng', spoken_reading:'míng', meaningVi:'sáng, rõ' }] },
    ong: { id:'ong', symbol:'ong', kind:'final', ipa:'[ʊŋ]', group:'Âm mũi -ng', articZone:'velar', asp:false, compareIds:['eng'],
           bullets:['Môi chu tròn nhỏ như u, kết hợp nâng gốc lưỡi đóng mũi sau /-ng/.','Âm vang sâu gần /u-ng/.'],
           tipVi:'Giữ môi tròn và tránh đọc bẹt sang /ông/ hoàn toàn.',
           examples:[{ hanzi:'中国', underlying_pinyin:'Zhōngguó', spoken_reading:'Zhōngguó', meaningVi:'Trung Quốc' },{ hanzi:'红', underlying_pinyin:'hóng', spoken_reading:'hóng', meaningVi:'màu đỏ' }] },
    iang:{ id:'iang', symbol:'iang', kind:'final', ipa:'[iɑŋ]', group:'Âm mũi -ng', articZone:'velar', asp:false, compareIds:['ian'],
           bullets:['Lướt /i/ sang /a/ sâu rồi đóng mũi sau gốc lưỡi /-ng/.'],
           tipVi:'Không đóng bằng đầu lưỡi như ian.',
           examples:[{ hanzi:'想', underlying_pinyin:'xiǎng', spoken_reading:'xiǎng', meaningVi:'muốn, nhớ' }] },
    uang:{ id:'uang', symbol:'uang', kind:'final', ipa:'[uɑŋ]', group:'Âm mũi -ng', articZone:'velar', asp:false, compareIds:['uan'],
           bullets:['Chu môi /u/ mở sang /a/ sâu rồi đóng gốc lưỡi /-ng/.'],
           tipVi:'Đứng một mình viết thành wang.',
           examples:[{ hanzi:'黄', underlying_pinyin:'huáng', spoken_reading:'huáng', meaningVi:'màu vàng' }] },
    iong:{ id:'iong', symbol:'iong', kind:'final', ipa:'[yʊŋ]', group:'Âm mũi -ng', articZone:'velar', asp:false, compareIds:['ong'],
           bullets:['Bắt đầu bằng độ tròn môi nhẹ phía trước rồi chuyển sang /-ung/ sau.','Khi đứng một mình viết thành yong.'],
           tipVi:'Giữ luồng hơi mũi sau dày ở phần cuối.',
           examples:[{ hanzi:'用', underlying_pinyin:'yòng', spoken_reading:'yòng', meaningVi:'dùng' }] },
    er:  { id:'er', symbol:'er', kind:'final', ipa:'[ɚ]', group:'Đặc biệt (uốn lưỡi)', articZone:'retroflex', asp:false, compareIds:['e'],
           bullets:['Đọc /ơ/ đồng thời cong đầu lưỡi nhẹ lên về phía vòm miệng.','Không ghép trực tiếp sau thanh mẫu; tự đứng làm âm tiết (ér, èr).','Hiện tượng cuốn lưỡi erhua (-r) gặp ở mức giao tiếp nâng cao.'],
           tipVi:'Vừa phát ra âm /ơ/ vừa uốn nhẹ đầu lưỡi lên (không chạm vòm).',
           examples:[{ hanzi:'二', underlying_pinyin:'èr', spoken_reading:'èr', meaningVi:'số hai' },{ hanzi:'儿', underlying_pinyin:'ér', spoken_reading:'ér', meaningVi:'con trẻ' }] }
  };

  // 7 Chương · 40 Bài chuẩn theo Tài liệu 01
  const CHAPTERS = [
    {
      id:'ch1', num:1, title:'Làm quen với Pinyin', subtitle:'Nhập môn hệ thống phiên âm',
      lessons:[
        { id:'py_1_1', code:'1.1', title:'Pinyin là gì & cấu tạo âm tiết', targets:['b','m','a'],
          theoryBullets:['Pinyin là hệ thống phiên âm chữ Hán bằng chữ cái Latin, không phải chữ Hán.','Một âm tiết đầy đủ gồm Thanh mẫu (âm đầu) + Vận mẫu (vần) + Thanh điệu (dấu thanh).','Một số âm tiết chỉ có vận mẫu và thanh điệu, không có thanh mẫu (ví dụ: ā, èr).'],
          tipVi:'Học tách bạch chữ Hán và Pinyin để đọc chuẩn ngay từ đầu.',
          examples:[{ hanzi:'妈', underlying_pinyin:'mā', spoken_reading:'mā', meaningVi:'mẹ (m + a + thanh 1)' },{ hanzi:'二', underlying_pinyin:'èr', spoken_reading:'èr', meaningVi:'số 2 (âm tiết không thanh mẫu)' }] },
        { id:'py_1_2', code:'1.2', title:'Nguyên tắc phát âm & bốn thanh điệu', targets:['m','a','d','t'],
          theoryBullets:['Khi phát âm cần chú ý đủ 3 yếu tố: âm đầu, phần vần và độ bật hơi.','Thanh điệu làm đổi hoàn toàn nghĩa từ dù cùng âm đầu và vần: mā (mẹ) – má (gai) – mǎ (ngựa) – mà (mắng).','Luôn luyện gắn thanh điệu cùng âm tiết có nghĩa thật.'],
          tipVi:'Không đọc lướt bỏ thanh điệu; sai thanh sẽ sang hẳn từ khác.',
          examples:[{ hanzi:'妈', underlying_pinyin:'mā', spoken_reading:'mā', meaningVi:'mẹ' },{ hanzi:'麻', underlying_pinyin:'má', spoken_reading:'má', meaningVi:'cây gai / tê' },{ hanzi:'马', underlying_pinyin:'mǎ', spoken_reading:'mǎ', meaningVi:'con ngựa' },{ hanzi:'骂', underlying_pinyin:'mà', spoken_reading:'mà', meaningVi:'mắng' }] },
        { id:'py_1_3', code:'1.3', title:'Quy tắc đặt dấu thanh & chữ ü', targets:['a','o','e','i','u','ü'],
          theoryBullets:['Dấu thanh luôn đặt trên nguyên âm hạt nhân theo thứ tự ưu tiên: a > o / e > i / u.','Riêng vần ghép iu và ui: dấu thanh đặt ở nguyên âm đứng SAU (liù, guì).','Chữ ü giữ nguyên 2 dấu chấm khi đi với n, l (nǚ, lǜ) và bỏ 2 dấu chấm sau j, q, x, y (jū, qù, xué, yú).'],
          tipVi:'Nhớ câu mẹo: có a đánh a, không a tìm o/e, i và u gặp nhau thì đánh chữ đứng sau.',
          examples:[{ hanzi:'好', underlying_pinyin:'hǎo', spoken_reading:'hǎo', meaningVi:'tốt (a đứng trước o)' },{ hanzi:'六', underlying_pinyin:'liù', spoken_reading:'liù', meaningVi:'số 6 (iu đánh trên u)' },{ hanzi:'女', underlying_pinyin:'nǚ', spoken_reading:'nǚ', meaningVi:'nữ (giữ ü)' }] }
      ]
    },
    {
      id:'ch2', num:2, title:'Thanh mẫu (21 âm)', subtitle:'声母 · Âm đầu tiếng Quan thoại',
      lessons:[
        { id:'py_2_1', code:'2.1', title:'b p m f', targets:['b','p','m','f'] },
        { id:'py_2_2', code:'2.2', title:'d t n l', targets:['d','t','n','l'] },
        { id:'py_2_3', code:'2.3', title:'g k h', targets:['g','k','h'] },
        { id:'py_2_4', code:'2.4', title:'j q x', targets:['j','q','x'] },
        { id:'py_2_5', code:'2.5', title:'zh ch sh r', targets:['zh','ch','sh','r'] },
        { id:'py_2_6', code:'2.6', title:'z c s', targets:['z','c','s'] },
        { id:'py_2_7', code:'2.7', title:'Ôn tập 21 thanh mẫu & đối lập bật hơi', targets:['b','p','d','t','g','k','j','q','zh','ch','z','c'] }
      ]
    },
    {
      id:'ch3', num:3, title:'Vận mẫu (36 âm)', subtitle:'韵母 · Vần đơn, vần kép & âm mũi',
      lessons:[
        { id:'py_3_1', code:'3.1', title:'a o e', targets:['a','o','e'] },
        { id:'py_3_2', code:'3.2', title:'i u ü', targets:['i','u','ü'] },
        { id:'py_3_3', code:'3.3', title:'ai ei ao ou', targets:['ai','ei','ao','ou'] },
        { id:'py_3_4', code:'3.4', title:'ia ie iao iu', targets:['ia','ie','iao','iu'] },
        { id:'py_3_5', code:'3.5', title:'ua uo uai ui, üe', targets:['ua','uo','uai','ui','üe'] },
        { id:'py_3_6', code:'3.6', title:'an en in un ün, ian uan üan', targets:['an','en','in','un','ün','ian','uan','üan'] },
        { id:'py_3_7', code:'3.7', title:'ang eng ing ong, iang iong uang', targets:['ang','eng','ing','ong','iang','uang','iong'] },
        { id:'py_3_8', code:'3.8', title:'er & đối chiếu các vần mũi', targets:['er','an','ang','en','eng','in','ing'] }
      ]
    },
    {
      id:'ch4', num:4, title:'Thanh điệu (4 thanh + nhẹ)', subtitle:'声调 · Bốn thanh & biến điệu',
      lessons:[
        { id:'py_4_1', code:'4.1', title:'Bốn thanh đọc đơn lẻ (55 · 35 · 214 · 51)', targets:['a','o','e'], toneLesson:true,
          theoryBullets:['Thanh 1 (55): cao và đều ngang — mā 妈.','Thanh 2 (35): đi lên dứt khoát — má 麻.','Thanh 3 (214 khi đọc đơn): hạ trầm xuống thấp rồi nâng lên — mǎ 马.','Thanh 4 (51): rơi nhanh và mạnh từ cao xuống thấp — mà 骂.'],
          tipVi:'Giá trị 55/35/214/51 là mô hình cao độ Chao tham chiếu, không chấm cứng từ một đường pitch đơn lẻ.',
          examples:[{ hanzi:'妈', underlying_pinyin:'mā', spoken_reading:'mā', meaningVi:'mẹ (Thanh 1)' },{ hanzi:'麻', underlying_pinyin:'má', spoken_reading:'má', meaningVi:'cây gai (Thanh 2)' },{ hanzi:'马', underlying_pinyin:'mǎ', spoken_reading:'mǎ', meaningVi:'ngựa (Thanh 3)' },{ hanzi:'骂', underlying_pinyin:'mà', spoken_reading:'mà', meaningVi:'mắng (Thanh 4)' }] },
        { id:'py_4_2', code:'4.2', title:'Thanh nhẹ (轻声)', targets:['a','e'], toneLesson:true,
          theoryBullets:['Thanh nhẹ không có đường cao độ cố định, đọc rất ngắn và nhẹ.','Cao độ thực tế phụ thuộc vào thanh điệu của âm tiết đứng trước.','Cần học theo từ vựng thực tế, không tự suy đoán mọi âm tiết cuối đều mang thanh nhẹ.'],
          tipVi:'Giữ lực hơi thật nhẹ và ngắn ở âm tiết thanh nhẹ.',
          examples:[{ hanzi:'妈妈', underlying_pinyin:'māma', spoken_reading:'māma', meaningVi:'mẹ' },{ hanzi:'爸爸', underlying_pinyin:'bàba', spoken_reading:'bàba', meaningVi:'bố' },{ hanzi:'谢谢', underlying_pinyin:'xièxie', spoken_reading:'xièxie', meaningVi:'cảm ơn' }] },
        { id:'py_4_3', code:'4.3', title:'Thanh 3 trong lời nói liên tục', targets:['n','h','m'], toneLesson:true,
          theoryBullets:['Khi hai âm tiết thanh 3 đứng liền nhau: âm đầu đọc thành dạng đi lên gần thanh 2.','Khi viết vẫn giữ nguyên dấu thanh 3 (underlying_pinyin: nǐ hǎo → spoken_reading: ní hǎo).','Trước thanh 1, 2, 4 hoặc thanh nhẹ, thanh 3 đọc nửa thanh 3 (chỉ giữ phần thấp 21).'],
          tipVi:'Nhìn vào chữ vẫn là dấu v, nhưng tai nghe và miệng đọc chữ đầu vút lên.',
          examples:[{ hanzi:'你好', underlying_pinyin:'nǐ hǎo', spoken_reading:'ní hǎo', meaningVi:'xin chào' },{ hanzi:'很好', underlying_pinyin:'hěn hǎo', spoken_reading:'hén hǎo', meaningVi:'rất tốt' },{ hanzi:'老师', underlying_pinyin:'lǎoshī', spoken_reading:'lǎoshī (nửa T3)', meaningVi:'giáo viên' }] },
        { id:'py_4_4', code:'4.4', title:'Biến điệu của “一” và “不”', targets:['b','u','i'], toneLesson:true,
          theoryBullets:['不 (bù): đọc thành bú (thanh 2) khi đứng trước âm tiết thanh 4 (不是 bú shì).','一 (yī): đọc độc lập/đếm số là yī; trước thanh 4 đọc yí (一个 yí ge); trước thanh 1, 2, 3 đọc yì (一天 yìtiān).','Trong sách chính tả thông thường hay giữ dấu gốc hoặc đánh dấu theo biến điệu tùy giáo trình; app luôn lưu cả hai dạng.'],
          tipVi:'Mẹo nhanh cho cả 一 và 不: gặp thanh 4 đằng sau thì đổi thành thanh 2 (yí, bú).',
          examples:[{ hanzi:'不是', underlying_pinyin:'bù shì', spoken_reading:'bú shì', meaningVi:'không phải' },{ hanzi:'不去', underlying_pinyin:'bù qù', spoken_reading:'bú qù', meaningVi:'không đi' },{ hanzi:'一个', underlying_pinyin:'yī gè', spoken_reading:'yí ge', meaningVi:'một cái' },{ hanzi:'一天', underlying_pinyin:'yī tiān', spoken_reading:'yì tiān', meaningVi:'một ngày' }] },
        { id:'py_4_5', code:'4.5', title:'Luyện tổ hợp hai âm tiết', targets:['zh','g','h'], toneLesson:true,
          theoryBullets:['Kết hợp đủ các cặp thanh 1+2, 1+4, 2+3, 3+4 để giữ đúng cao độ từng chữ.','Chú ý không làm thanh 1 bị tụt xuống ở cuối âm trước âm thanh 4.'],
          tipVi:'Đọc chậm từng cặp hai chữ rồi mới tăng tốc sang nhịp tự nhiên.',
          examples:[{ hanzi:'中国', underlying_pinyin:'Zhōngguó', spoken_reading:'Zhōngguó', meaningVi:'Trung Quốc (1+2)' },{ hanzi:'汉语', underlying_pinyin:'Hànyǔ', spoken_reading:'Hànyǔ', meaningVi:'tiếng Hán (4+3)' },{ hanzi:'请问', underlying_pinyin:'qǐngwèn', spoken_reading:'qǐngwèn', meaningVi:'xin hỏi (3+4)' }] }
      ]
    },
    {
      id:'ch5', num:5, title:'Các âm dễ nhầm', subtitle:'Đối chiếu cặp âm then chốt',
      lessons:[
        { id:'py_5_1', code:'5.1', title:'Cặp zh – z', pairId:'zh-z', targets:['zh','z'] },
        { id:'py_5_2', code:'5.2', title:'Cặp ch – c', pairId:'ch-c', targets:['ch','c'] },
        { id:'py_5_3', code:'5.3', title:'Cặp sh – s', pairId:'sh-s', targets:['sh','s'] },
        { id:'py_5_4', code:'5.4', title:'Cặp j – zh', pairId:'j-zh', targets:['j','zh'] },
        { id:'py_5_5', code:'5.5', title:'Cặp q – ch', pairId:'q-ch', targets:['q','ch'] },
        { id:'py_5_6', code:'5.6', title:'Cặp x – sh', pairId:'x-sh', targets:['x','sh'] },
        { id:'py_5_7', code:'5.7', title:'Cặp n – l', pairId:'n-l', targets:['n','l'] },
        { id:'py_5_8', code:'5.8', title:'Vần mũi an/ang · en/eng · in/ing', pairId:'an-ang', targets:['an','ang','en','eng','in','ing'] }
      ]
    },
    {
      id:'ch6', num:6, title:'Ghép âm tiết & luyện đọc', subtitle:'Quy tắc chính tả & bảng âm tiết chuẩn',
      lessons:[
        { id:'py_6_1', code:'6.1', title:'Ghép thanh mẫu & vận mẫu hợp lệ', targets:['b','p','d','zh'], openChart:true,
          theoryBullets:['Không phải thanh mẫu nào cũng ghép được với mọi vận mẫu (không tự nhân 21 × toàn bộ vần).','Ví dụ: b/p/m/f không ghép với ua, uai; j/q/x chỉ ghép với vần bắt đầu bằng i hoặc ü.','Sử dụng Bảng ghép âm tiết đã kiểm tra để tra và nghe phát âm chuẩn.'],
          tipVi:'Mở Bảng ghép Pinyin bên dưới để kiểm tra tổ hợp âm tiết hợp lệ.' },
        { id:'py_6_2', code:'6.2', title:'Quy tắc ü sau j/q/x và n/l', targets:['ü','n','l','j','q','x'],
          theoryBullets:['j/q/x không bao giờ đi với u thường: ju/qu/xu/jue/que/xue/juan/quan/xuan/jun/qun/xun đều đọc là ü.','n và l ghép được với cả u và ü, vì vậy PHẢI giữ hai dấu chấm ở nü, lü để phân biệt với nu, lu.'],
          tipVi:'Gặp j/q/x/y đi với u → luôn chu môi đọc thành ü; gặp n/l mới phải chú ý dấu hai chấm.' },
        { id:'py_6_3', code:'6.3', title:'Không thanh mẫu (y/w) & rút gọn iou/uei/uen', targets:['iu','ui','un','i','u'],
          theoryBullets:['Vần bắt đầu bằng i đứng một mình thêm y hoặc đổi i→y: i→yi, ia→ya, ie→ye, iao→yao, iu→you.','Vần bắt đầu bằng u đứng một mình thêm w hoặc đổi u→w: u→wu, ua→wa, uo→wo, ui→wei.','Sau thanh mẫu: iou→iu (liu, không viết liou), uei→ui (gui, không viết guei), uen→un (lun).'],
          tipVi:'Dù viết gọn thành iu/ui, khi đọc chậm vẫn nghe thoáng nguyên âm chuyển tiếp ở giữa.' },
        { id:'py_6_4', code:'6.4', title:'Thực hành tra bảng & ghép thanh điệu', targets:['zh','z','iu','ui'], openChart:true,
          theoryBullets:['Chỉ gắn nghĩa tiếng Việt với âm tiết có từ thông dụng thực tế, không gán tùy tiện cả 4 thanh.','Âm tiết zi/ci/si và zhi/chi/shi/ri có nguyên âm đặc biệt, không đọc là /i/.'],
          tipVi:'Chọn từng nhóm thanh mẫu trong Bảng ghép âm để luyện tai phân biệt.' }
      ]
    },
    {
      id:'ch7', num:7, title:'Phát âm tự nhiên', subtitle:'Nhịp điệu, trọng âm & ngữ điệu câu',
      lessons:[
        { id:'py_7_1', code:'7.1', title:'Nhịp hai âm tiết', targets:['h','x'],
          theoryBullets:['Từ vựng tiếng Trung hiện đại phần lớn có cấu trúc nhịp 2 âm tiết (老师, 朋友, 喜欢).','Âm tiết sau nếu là thanh đầy đủ cần giữ rõ đường cao độ; nếu là thanh nhẹ thì lướt gọn.'],
          tipVi:'Ngắt hơi theo cặp từ có nghĩa thay vì tách từng tiếng rời rạc.',
          examples:[{ hanzi:'老师好', underlying_pinyin:'lǎoshī hǎo', spoken_reading:'lǎoshī hǎo', meaningVi:'Chào thầy/cô' },{ hanzi:'没关系', underlying_pinyin:'méi guānxi', spoken_reading:'méi guānxi', meaningVi:'Không sao đâu' }] },
        { id:'py_7_2', code:'7.2', title:'Trọng âm từ và câu', targets:['t','h'],
          theoryBullets:['Trong từ ghép 2 chữ có thanh đầy đủ, âm tiết sau thường hơi nhấn rõ hơn (hoặc bằng nhau).','Từ mang thông tin chính trong câu được giữ cao độ thanh điệu rõ nét nhất.'],
          tipVi:'Không nhấn bằng cách làm bẹp thanh điệu vốn có của chữ.',
          examples:[{ hanzi:'我很忙', underlying_pinyin:'wǒ hěn máng', spoken_reading:'wǒ hén máng', meaningVi:'Tôi rất bận' },{ hanzi:'明天见', underlying_pinyin:'míngtiān jiàn', spoken_reading:'míngtiān jiàn', meaningVi:'Ngày mai gặp lại' }] },
        { id:'py_7_3', code:'7.3', title:'Ngắt nhóm ý trong câu dài', targets:['zh','g'],
          theoryBullets:['Chia câu theo cụm chủ ngữ – động từ – tân ngữ hoặc cụm thời gian/địa điểm.','Ngắt nghỉ ngắn tự nhiên giữa các cụm ý giúp người nghe hiểu dễ dàng dù nói chậm.'],
          tipVi:'Nghỉ nhẹ sau chủ ngữ hoặc cụm trạng ngữ thay vì nghỉ giữa từ ghép.',
          examples:[{ hanzi:'我明天 / 去中国。', underlying_pinyin:'Wǒ míngtiān / qù Zhōngguó.', spoken_reading:'Wǒ míngtiān / qù Zhōngguó.', meaningVi:'Ngày mai tôi đi Trung Quốc.' }] },
        { id:'py_7_4', code:'7.4', title:'Ngữ điệu câu hỏi & khẳng định', targets:['m','a'],
          theoryBullets:['Đường pitch câu tiếng Trung là sự tương tác giữa thanh điệu từng chữ + trọng âm + chức năng câu.','KHÔNG nâng giọng cuối câu hỏi lên cao như tiếng Anh vì sẽ làm méo thanh điệu chữ cuối (nhất là 吗 thanh nhẹ hoặc câu hỏi có từ nghi vấn 什么/哪儿).'],
          tipVi:'Giữ đúng thanh điệu của từng từ; dùng trợ từ nghi vấn 吗 hoặc 吗? nhẹ tự nhiên.',
          examples:[{ hanzi:'你忙吗？', underlying_pinyin:'Nǐ máng ma?', spoken_reading:'Nǐ máng ma?', meaningVi:'Bạn bận không?' },{ hanzi:'你叫什么名字？', underlying_pinyin:'Nǐ jiào shénme míngzi?', spoken_reading:'Nǐ jiào shénme míngzi?', meaningVi:'Bạn tên là gì?' }] },
        { id:'py_7_5', code:'7.5', title:'Luyện hội thoại ngắn tự nhiên', targets:['n','h','x'],
          theoryBullets:['Tổng hợp phát âm thanh mẫu, vận mẫu, biến điệu thanh 3 và nhịp câu vào hội thoại giao tiếp.','Nghe mẫu tự nhiên rồi đọc theo đúng tốc độ, giữ rõ thanh nhẹ cuối từ.'],
          tipVi:'Thử nghe tốc độ chuẩn trước, bấm Nghe chậm nếu cần soi biến điệu.',
          examples:[{ hanzi:'你好！请问，你叫什么名字？', underlying_pinyin:'Nǐ hǎo! Qǐngwèn, nǐ jiào shénme míngzi?', spoken_reading:'Ní hǎo! Qǐngwèn, nǐ jiào shénme míngzi?', meaningVi:'Xin chào! Xin hỏi bạn tên là gì?' },{ hanzi:'谢谢！再见！', underlying_pinyin:'Xièxie! Zàijiàn!', spoken_reading:'Xièxie! Zàijiàn!', meaningVi:'Cảm ơn! Tạm biệt!' }] }
      ]
    }
  ];

  // 14 cặp dễ nhầm (Tài liệu 06)
  const CONFUSABLE_PAIRS = [
    { id:'zh-z', a:'zh', b:'z', diff:'zh uốn đầu lưỡi vùng sau lợi; z thẳng đầu lưỡi sau răng cửa trên.', exA:{ zh:'知道', py:'zhīdào', vi:'biết' }, exB:{ zh:'再见', py:'zàijiàn', vi:'tạm biệt' } },
    { id:'ch-c', a:'ch', b:'c', diff:'Cả hai đều bật hơi mạnh; ch cong lưỡi sau lợi, c thẳng lưỡi đầu răng.', exA:{ zh:'吃', py:'chī', vi:'ăn' }, exB:{ zh:'菜', py:'cài', vi:'món ăn' } },
    { id:'sh-s', a:'sh', b:'s', diff:'Cùng là âm xát không bật hơi; sh cong lưỡi trầm hơn, s thẳng lưỡi mảnh sắc.', exA:{ zh:'书', py:'shū', vi:'sách' }, exB:{ zh:'三', py:'sān', vi:'số ba' } },
    { id:'j-zh', a:'j', b:'zh', diff:'j dùng mặt lưỡi trước áp ngạc cứng; zh dùng đầu lưỡi uốn vùng sau lợi.', exA:{ zh:'家', py:'jiā', vi:'nhà' }, exB:{ zh:'住', py:'zhù', vi:'ở' } },
    { id:'q-ch', a:'q', b:'ch', diff:'Đều bật hơi mạnh; q dùng mặt lưỡi trước, ch dùng đầu lưỡi sau lợi.', exA:{ zh:'去', py:'qù', vi:'đi' }, exB:{ zh:'茶', py:'chá', vi:'trà' } },
    { id:'x-sh', a:'x', b:'sh', diff:'x xát mặt lưỡi trước dịu mảnh; sh xát đầu lưỡi sau lợi dày hơn.', exA:{ zh:'小', py:'xiǎo', vi:'nhỏ' }, exB:{ zh:'是', py:'shì', vi:'là' } },
    { id:'b-p',  a:'b', b:'p', diff:'Cùng hai môi khép mở; b không bật hơi, p bật hơi mạnh.', exA:{ zh:'爸爸', py:'bàba', vi:'bố' }, exB:{ zh:'怕', py:'pà', vi:'sợ' } },
    { id:'d-t',  a:'d', b:'t', diff:'Cùng đầu lưỡi vùng lợi; d không bật hơi, t bật hơi mạnh.', exA:{ zh:'大', py:'dà', spoken_reading:'dà', vi:'to' }, exB:{ zh:'他', py:'tā', vi:'anh ấy' } },
    { id:'g-k',  a:'g', b:'k', diff:'Cùng gốc lưỡi ngạc mềm; g không bật hơi, k bật hơi mạnh.', exA:{ zh:'哥哥', py:'gēge', vi:'anh trai' }, exB:{ zh:'看', py:'kàn', vi:'xem' } },
    { id:'n-l',  a:'n', b:'l', diff:'n là âm mũi (khí qua mũi); l là âm bên (khí thoát hai bên mép lưỡi).', exA:{ zh:'你', py:'nǐ', vi:'bạn' }, exB:{ zh:'老师', py:'lǎoshī', vi:'giáo viên' } },
    { id:'u-ü',  a:'u', b:'ü', diff:'Đều tròn môi; u lưỡi lùi sau, ü giữ lưỡi cao phía trước giống i.', exA:{ zh:'路', py:'lù', vi:'con đường' }, exB:{ zh:'绿', py:'lǜ', vi:'xanh lá' } },
    { id:'an-ang', a:'an', b:'ang', diff:'an kết thúc mũi đầu lưỡi -n; ang kết thúc mũi gốc lưỡi -ng.', exA:{ zh:'看', py:'kàn', vi:'xem' }, exB:{ zh:'忙', py:'máng', vi:'bận' } },
    { id:'en-eng', a:'en', b:'eng', diff:'en đầu lưỡi -n gọn ngắn; eng gốc lưỡi -ng vang sâu.', exA:{ zh:'很', py:'hěn', vi:'rất' }, exB:{ zh:'朋友', py:'péngyou', vi:'bạn bè' } },
    { id:'in-ing', a:'in', b:'ing', diff:'in đóng đầu lưỡi -n; ing đóng gốc lưỡi -ng.', exA:{ zh:'新', py:'xīn', vi:'mới' }, exB:{ zh:'听', py:'tīng', vi:'nghe' } }
  ];

  // Bảng ghép âm tiết mẫu đã kiểm tra hợp lệ (Tài liệu 05 — không tự nhân 21 x tất cả vần)
  const VERIFIED_SYLLABLES = [
    { initial:'b', list:[{py:'ba',han:'八',vi:'tám'},{py:'bai',han:'白',vi:'trắng'},{py:'bao',han:'包',vi:'túi'},{py:'bei',han:'杯',vi:'cốc'},{py:'bi',han:'笔',vi:'bút'},{py:'bian',han:'边',vi:'bên'},{py:'bing',han:'冰',vi:'băng'},{py:'bo',han:'波',vi:'sóng'},{py:'bu',han:'不',vi:'không'}] },
    { initial:'p', list:[{py:'pa',han:'怕',vi:'sợ'},{py:'pai',han:'拍',vi:'vỗ'},{py:'pao',han:'跑',vi:'chạy'},{py:'pei',han:'陪',vi:'đi cùng'},{py:'pi',han:'皮',vi:'da'},{py:'pian',han:'片',vi:'mảnh'},{py:'ping',han:'平',vi:'phẳng'},{py:'po',han:'坡',vi:'dốc'},{py:'pu',han:'普',vi:'phổ thông'}] },
    { initial:'m', list:[{py:'ma',han:'妈',vi:'mẹ'},{py:'mai',han:'买',vi:'mua'},{py:'man',han:'慢',vi:'chậm'},{py:'mang',han:'忙',vi:'bận'},{py:'mei',han:'妹',vi:'em gái'},{py:'mi',han:'米',vi:'gạo'},{py:'mian',han:'面',vi:'mì, mặt'},{py:'ming',han:'明',vi:'sáng'},{py:'mo',han:'摸',vi:'sờ'},{py:'mu',han:'木',vi:'gỗ'}] },
    { initial:'f', list:[{py:'fa',han:'发',vi:'phát'},{py:'fan',han:'饭',vi:'cơm'},{py:'fang',han:'方',vi:'phương'},{py:'fei',han:'飞',vi:'bay'},{py:'fen',han:'分',vi:'phút'},{py:'feng',han:'风',vi:'gió'},{py:'fo',han:'佛',vi:'Phật'},{py:'fu',han:'服',vi:'phục vụ'}] },
    { initial:'d', list:[{py:'da',han:'大',vi:'to'},{py:'dai',han:'带',vi:'mang'},{py:'dan',han:'单',vi:'đơn'},{py:'dang',han:'当',vi:'làm'},{py:'dao',han:'到',vi:'đến'},{py:'de',han:'的',vi:'của'},{py:'di',han:'弟',vi:'em trai'},{py:'dian',han:'电',vi:'điện'},{py:'ding',han:'订',vi:'đặt'},{py:'dong',han:'东',vi:'đông'},{py:'du',han:'读',vi:'đọc'}] },
    { initial:'t', list:[{py:'ta',han:'他',vi:'anh ấy'},{py:'tai',han:'太',vi:'quá'},{py:'tan',han:'谈',vi:'nói chuyện'},{py:'tang',han:'汤',vi:'canh'},{py:'tao',han:'套',vi:'bộ'},{py:'te',han:'特',vi:'đặc biệt'},{py:'ti',han:'体',vi:'cơ thể'},{py:'tian',han:'天',vi:'trời'},{py:'ting',han:'听',vi:'nghe'},{py:'tong',han:'同',vi:'cùng'},{py:'tu',han:'图',vi:'hình'}] },
    { initial:'n', list:[{py:'na',han:'那',vi:'kia'},{py:'nai',han:'奶',vi:'sữa'},{py:'nan',han:'男',vi:'nam'},{py:'nang',han:'囊',vi:'túi'},{py:'nao',han:'脑',vi:'não'},{py:'ne',han:'呢',vi:'nhỉ'},{py:'ni',han:'你',vi:'bạn'},{py:'nian',han:'年',vi:'năm'},{py:'ning',han:'宁',vi:'yên'},{py:'nong',han:'农',vi:'nông'},{py:'nu',han:'努',vi:'nỗ lực'},{py:'nü',han:'女',vi:'nữ'}] },
    { initial:'l', list:[{py:'la',han:'拉',vi:'kéo'},{py:'lai',han:'来',vi:'đến'},{py:'lan',han:'蓝',vi:'xanh lam'},{py:'lang',han:'浪',vi:'sóng'},{py:'lao',han:'老',vi:'già, cũ'},{py:'le',han:'了',vi:'rồi'},{py:'li',han:'里',vi:'bên trong'},{py:'lian',han:'练',vi:'luyện'},{py:'ling',han:'零',vi:'số không'},{py:'long',han:'龙',vi:'rồng'},{py:'lu',han:'路',vi:'đường'},{py:'lü',han:'绿',vi:'xanh lá'}] },
    { initial:'g', list:[{py:'ga',han:'嘎',vi:'cạp'},{py:'gai',han:'改',vi:'sửa'},{py:'gan',han:'干',vi:'khô'},{py:'gang',han:'刚',vi:'vừa mới'},{py:'gao',han:'高',vi:'cao'},{py:'ge',han:'哥',vi:'anh trai'},{py:'gen',han:'跟',vi:'cùng với'},{py:'geng',han:'更',vi:'hơn'},{py:'gong',han:'工',vi:'công việc'},{py:'gu',han:'古',vi:'cổ'}] },
    { initial:'k', list:[{py:'ka',han:'卡',vi:'thẻ'},{py:'kai',han:'开',vi:'mở'},{py:'kan',han:'看',vi:'xem'},{py:'kang',han:'康',vi:'khỏe'},{py:'kao',han:'考',vi:'thi'},{py:'ke',han:'课',vi:'bài học'},{py:'ken',han:'肯',vi:'chắc'},{py:'keng',han:'坑',vi:'hố'},{py:'kong',han:'空',vi:'trống'},{py:'ku',han:'哭',vi:'khóc'}] },
    { initial:'h', list:[{py:'ha',han:'哈',vi:'ha'},{py:'hai',han:'海',vi:'biển'},{py:'han',han:'汉',vi:'Hán'},{py:'hang',han:'行',vi:'hàng'},{py:'hao',han:'好',vi:'tốt'},{py:'he',han:'喝',vi:'uống'},{py:'hen',han:'很',vi:'rất'},{py:'heng',han:'横',vi:'ngang'},{py:'hong',han:'红',vi:'đỏ'},{py:'hu',han:'湖',vi:'hồ'}] },
    { initial:'j', list:[{py:'ji',han:'几',vi:'mấy'},{py:'jia',han:'家',vi:'nhà'},{py:'jian',han:'见',vi:'gặp'},{py:'jiang',han:'讲',vi:'nói'},{py:'jiao',han:'叫',vi:'gọi'},{py:'jie',han:'姐',vi:'chị'},{py:'jin',han:'今',vi:'nay'},{py:'jing',han:'京',vi:'kinh đô'},{py:'jiong',han:'窘',vi:'lúng túng'},{py:'jiu',han:'九',vi:'chín'},{py:'ju',han:'句',vi:'câu'},{py:'jue',han:'觉',vi:'cảm thấy'},{py:'jun',han:'军',vi:'quân'}] },
    { initial:'q', list:[{py:'qi',han:'七',vi:'bảy'},{py:'qia',han:'恰',vi:'vừa khéo'},{py:'qian',han:'前',vi:'trước'},{py:'qiang',han:'强',vi:'mạnh'},{py:'qiao',han:'桥',vi:'cầu'},{py:'qie',han:'切',vi:'cắt'},{py:'qin',han:'亲',vi:'thân'},{py:'qing',han:'请',vi:'mời'},{py:'qiong',han:'穷',vi:'nghèo'},{py:'qiu',han:'秋',vi:'thu'},{py:'qu',han:'去',vi:'đi'},{py:'que',han:'缺',vi:'thiếu'},{py:'qun',han:'群',vi:'nhóm'}] },
    { initial:'x', list:[{py:'xi',han:'西',vi:'tây'},{py:'xia',han:'下',vi:'dưới'},{py:'xian',han:'先',vi:'trước'},{py:'xiang',han:'想',vi:'muốn'},{py:'xiao',han:'小',vi:'nhỏ'},{py:'xie',han:'写',vi:'viết'},{py:'xin',han:'新',vi:'mới'},{py:'xing',han:'星',vi:'sao'},{py:'xiong',han:'兄',vi:'anh'},{py:'xiu',han:'休',vi:'nghỉ'},{py:'xu',han:'需',vi:'cần'},{py:'xue',han:'学',vi:'học'},{py:'xun',han:'寻',vi:'tìm'}] },
    { initial:'zh', list:[{py:'zha',han:'炸',vi:'chiên'},{py:'zhai',han:'摘',vi:'hái'},{py:'zhan',han:'站',vi:'đứng'},{py:'zhang',han:'张',vi:'tờ, trương'},{py:'zhao',han:'找',vi:'tìm'},{py:'zhe',han:'这',vi:'này'},{py:'zhen',han:'真',vi:'thật'},{py:'zheng',han:'正',vi:'chính'},{py:'zhi',han:'知',vi:'biết'},{py:'zhong',han:'中',vi:'trung'},{py:'zhou',han:'周',vi:'tuần'},{py:'zhu',han:'住',vi:'ở'}] },
    { initial:'ch', list:[{py:'cha',han:'茶',vi:'trà'},{py:'chai',han:'拆',vi:'tháo'},{py:'chan',han:'产',vi:'sản xuất'},{py:'chang',han:'长',vi:'dài'},{py:'chao',han:'吵',vi:'ồn'},{py:'che',han:'车',vi:'xe'},{py:'chen',han:'趁',vi:'nhân lúc'},{py:'cheng',han:'成',vi:'thành'},{py:'chi',han:'吃',vi:'ăn'},{py:'chong',han:'重',vi:'lặp lại'},{py:'chou',han:'抽',vi:'rút'},{py:'chu',han:'出',vi:'ra'}] },
    { initial:'sh', list:[{py:'sha',han:'沙',vi:'cát'},{py:'shai',han:'晒',vi:'phơi'},{py:'shan',han:'山',vi:'núi'},{py:'shang',han:'上',vi:'trên'},{py:'shao',han:'少',vi:'ít'},{py:'she',han:'社',vi:'xã hội'},{py:'shen',han:'什',vi:'cái gì'},{py:'sheng',han:'生',vi:'sinh'},{py:'shi',han:'是',vi:'là'},{py:'shou',han:'手',vi:'tay'},{py:'shu',han:'书',vi:'sách'}] },
    { initial:'r', list:[{py:'ran',han:'然',vi:'nhiên'},{py:'rang',han:'让',vi:'nhường'},{py:'rao',han:'绕',vi:'quấn'},{py:'re',han:'热',vi:'nóng'},{py:'ren',han:'人',vi:'người'},{py:'reng',han:'扔',vi:'ném'},{py:'ri',han:'日',vi:'ngày'},{py:'rong',han:'容',vi:'dung'},{py:'rou',han:'肉',vi:'thịt'},{py:'ru',han:'入',vi:'vào'}] },
    { initial:'z', list:[{py:'za',han:'杂',vi:'tạp'},{py:'zai',han:'在',vi:'ở'},{py:'zan',han:'咱',vi:'chúng ta'},{py:'zang',han:'脏',vi:'bẩn'},{py:'zao',han:'早',vi:'sớm'},{py:'ze',han:'则',vi:'quy tắc'},{py:'zen',han:'怎',vi:'thế nào'},{py:'zeng',han:'增',vi:'tăng'},{py:'zi',han:'字',vi:'chữ'},{py:'zong',han:'总',vi:'tổng'},{py:'zou',han:'走',vi:'đi'},{py:'zu',han:'租',vi:'thuê'}] },
    { initial:'c', list:[{py:'ca',han:'擦',vi:'lau'},{py:'cai',han:'菜',vi:'món ăn'},{py:'can',han:'参',vi:'tham gia'},{py:'cang',han:'藏',vi:'giấu'},{py:'cao',han:'草',vi:'cỏ'},{py:'ce',han:'册',vi:'tập'},{py:'cen',han:'参',vi:'sâm'},{py:'ceng',han:'层',vi:'tầng'},{py:'ci',han:'次',vi:'lần'},{py:'cong',han:'从',vi:'từ'},{py:'cou',han:'凑',vi:'gom'},{py:'cu',han:'粗',vi:'thô'}] },
    { initial:'s', list:[{py:'sa',han:'洒',vi:'rắc'},{py:'sai',han:'赛',vi:'thi đấu'},{py:'san',han:'三',vi:'ba'},{py:'sang',han:'嗓',vi:'cổ họng'},{py:'sao',han:'扫',vi:'quét'},{py:'se',han:'色',vi:'màu sắc'},{py:'sen',han:'森',vi:'rừng rậm'},{py:'seng',han:'僧',vi:'nhà sư'},{py:'si',han:'四',vi:'bốn'},{py:'song',han:'送',vi:'tặng'},{py:'sou',han:'搜',vi:'tìm kiếm'},{py:'su',han:'诉',vi:'kể'}] }
  ];

  // Ngân hàng câu hỏi chuẩn từ Tài liệu 07 (Q001-Q020) + câu hỏi chọn Pinyin theo từ thật
  const QUESTION_BANK = [
    { id:'Q001', ch:'ch5', type:'lý thuyết', promptVi:'Trong zh/z, âm nào cấu âm về phía sau lợi hơn?', opts:['zh','z','j','c'], ans:'zh', explain:'zh thuộc vùng sau lợi (quặt lưỡi), z ở đầu lưỡi trước.', phonemeId:'zh', confusedWith:'z' },
    { id:'Q002', ch:'ch2', type:'lý thuyết', promptVi:'Trong b/p, âm nào bật hơi mạnh hơn?', opts:['p','b','m','f'], ans:'p', explain:'p là âm hai môi bật hơi mạnh; b không bật hơi.', phonemeId:'p', confusedWith:'b' },
    { id:'Q003', ch:'ch2', type:'lý thuyết', promptVi:'Trong j/q, âm nào bật hơi mạnh hơn?', opts:['q','j','x','zh'], ans:'q', explain:'q là âm mặt lưỡi trước bật hơi mạnh; j không bật hơi.', phonemeId:'q', confusedWith:'j' },
    { id:'Q004', ch:'ch5', type:'lý thuyết', promptVi:'Trong sh/s, âm nào là âm vùng sau lợi?', opts:['sh','s','x','r'], ans:'sh', explain:'sh cấu âm ở vùng sau lợi; s ở đầu lưỡi trước.', phonemeId:'sh', confusedWith:'s' },
    { id:'Q005', ch:'ch3', type:'lý thuyết', promptVi:'ü khác u chủ yếu ở điểm nào?', opts:['vị trí lưỡi','độ tròn môi','độ bật hơi','âm mũi'], ans:'vị trí lưỡi', explain:'Cả u và ü đều tròn môi, nhưng ü lưỡi cao phía trước còn u lưỡi cao phía sau.', phonemeId:'ü', confusedWith:'u' },
    { id:'Q006', ch:'ch5', type:'lý thuyết', promptVi:'an và ang khác nhau ở âm cuối nào?', opts:['-n / -ng','a / o','bật hơi / không bật hơi','thanh nhẹ'], ans:'-n / -ng', explain:'an kết thúc mũi đầu lưỡi -n; ang kết thúc mũi gốc lưỡi -ng.', phonemeId:'an', confusedWith:'ang' },
    { id:'Q007', ch:'ch6', type:'chính tả', promptVi:'j + ü được viết thành dạng Pinyin chuẩn nào?', opts:['ju','jü','jiu','jua'], ans:'ju', explain:'Khi ghép sau j/q/x/y, chữ ü bỏ hai dấu chấm thành u.', phonemeId:'ü' },
    { id:'Q008', ch:'ch6', type:'chính tả', promptVi:'n + ü được viết thành dạng Pinyin chuẩn nào?', opts:['nü','nu','nyu','niu'], ans:'nü', explain:'Sau n và l phải giữ hai dấu chấm (nü, lü) để phân biệt với nu, lu.', phonemeId:'ü' },
    { id:'Q009', ch:'ch4', type:'thanh điệu', promptVi:'Chữ “mā” (妈 – mẹ) mang thanh mấy?', opts:['Thanh 1','Thanh 2','Thanh 3','Thanh 4'], ans:'Thanh 1', explain:'Dấu ngang (¯) là thanh 1 (cao đều 55).' },
    { id:'Q010', ch:'ch4', type:'thanh điệu', promptVi:'Chữ “má” (麻) mang thanh mấy?', opts:['Thanh 2','Thanh 1','Thanh 3','Thanh 4'], ans:'Thanh 2', explain:'Dấu sắc đi lên (ˊ) là thanh 2 (35).' },
    { id:'Q011', ch:'ch4', type:'thanh điệu', promptVi:'Chữ “mǎ” (马 – ngựa) mang thanh mấy?', opts:['Thanh 3','Thanh 1','Thanh 2','Thanh 4'], ans:'Thanh 3', explain:'Dấu móc (ˇ) là thanh 3 (xuống thấp rồi lên).' },
    { id:'Q012', ch:'ch4', type:'thanh điệu', promptVi:'Chữ “mà” (骂 – mắng) mang thanh mấy?', opts:['Thanh 4','Thanh 1','Thanh 2','Thanh 3'], ans:'Thanh 4', explain:'Dấu huyền xuống (ˋ) là thanh 4 (rơi mạnh 51).' },
    { id:'Q013', ch:'ch4', type:'biến điệu', promptVi:'“不” (bù) đứng trước âm tiết thanh 4 thường đọc thành?', opts:['bú','bù','bū','bǔ'], ans:'bú', explain:'Trước thanh 4, bù biến điệu đọc thành bú (ví dụ: 不是 bú shì).' },
    { id:'Q014', ch:'ch4', type:'biến điệu', promptVi:'Hai thanh 3 liền nhau, thanh 3 đầu thường đọc giống thanh nào?', opts:['thanh 2','thanh 1','thanh 4','thanh nhẹ'], ans:'thanh 2', explain:'Hai thanh 3 đi liền (ví dụ 你好 nǐ hǎo) thì chữ đầu đọc gần thanh 2 (ní hǎo), viết vẫn giữ dấu thanh 3.' },
    { id:'Q015', ch:'ch6', type:'chính tả', promptVi:'Vần iou đi sau thanh mẫu l viết chuẩn thành?', opts:['liu','liou','lu','liuo'], ans:'liu', explain:'iou đi sau thanh mẫu viết rút gọn thành iu (ví dụ liù 六).' },
    { id:'Q016', ch:'ch6', type:'chính tả', promptVi:'Vần uei đi sau thanh mẫu g viết chuẩn thành?', opts:['gui','guei','gu','giu'], ans:'gui', explain:'uei đi sau thanh mẫu viết rút gọn thành ui (ví dụ guì 贵).' },
    { id:'Q017', ch:'ch2', type:'cấu âm', promptVi:'m là âm gì?', opts:['âm mũi hai môi','âm bên','âm bật hơi','âm sau lợi'], ans:'âm mũi hai môi', explain:'Khi phát âm m, hai môi khép lại và luồng khí đi qua mũi.', phonemeId:'m' },
    { id:'Q018', ch:'ch2', type:'cấu âm', promptVi:'l là âm gì?', opts:['âm bên','âm mũi hai môi','âm mặt lưỡi','âm tắc bật hơi'], ans:'âm bên', explain:'Khi phát âm l, đầu lưỡi chạm vùng lợi và luồng hơi thoát sang hai bên mép lưỡi.', phonemeId:'l' },
    { id:'Q019', ch:'ch2', type:'cấu âm', promptVi:'z thuộc nhóm nào?', opts:['đầu lưỡi trước','sau lợi (quặt lưỡi)','mặt lưỡi trước','gốc lưỡi'], ans:'đầu lưỡi trước', explain:'z phát âm với đầu lưỡi thẳng ở phía trước sau răng trên, khác với zh vùng sau lợi.', phonemeId:'z', confusedWith:'zh' },
    { id:'Q020', ch:'ch2', type:'cấu âm', promptVi:'x thuộc nhóm nào?', opts:['mặt lưỡi trước','sau lợi (quặt lưỡi)','hai môi','đầu lưỡi trước'], ans:'mặt lưỡi trước', explain:'x là âm xát mặt lưỡi trước gần ngạc cứng, khác với sh vùng sau lợi.', phonemeId:'x', confusedWith:'sh' },
    // Ngân hàng câu hỏi chọn pinyin đúng cho từ thật (giống ảnh demo China 中国)
    { id:'Q101', ch:'ch2', type:'từ vựng', hanzi:'中国', promptVi:'Chọn pinyin đúng cho từ sau:', opts:['Zhōngguó','Zōngguó','Chōngguó','Zhòngguó'], ans:'Zhōngguó', explain:'中国 (Zhōngguó – Trung Quốc) bắt đầu bằng zh (sau lợi, thanh 1) + g (thanh 2).', phonemeId:'zh', confusedWith:'z' },
    { id:'Q102', ch:'ch2', type:'từ vựng', hanzi:'知道', promptVi:'Chọn pinyin đúng cho từ sau:', opts:['zhīdào','zīdào','chīdào','jīdào'], ans:'zhīdào', explain:'知道 (zhīdào – biết) gồm thanh mẫu quặt lưỡi zh và d không bật hơi.', phonemeId:'zh', confusedWith:'z' },
    { id:'Q103', ch:'ch2', type:'từ vựng', hanzi:'谢谢', promptVi:'Chọn pinyin đúng cho từ sau:', opts:['xièxie','shèshie','sièsie','jièjie'], ans:'xièxie', explain:'谢谢 (xièxie – cảm ơn) bắt đầu bằng âm mặt lưỡi x, âm tiết thứ hai đọc thanh nhẹ.', phonemeId:'x', confusedWith:'sh' },
    { id:'Q104', ch:'ch2', type:'từ vựng', hanzi:'老师', promptVi:'Chọn pinyin đúng cho từ sau:', opts:['lǎoshī', 'nǎoshī', 'lǎosī', 'rǎoshī'], ans:'lǎoshī', explain:'老师 (lǎoshī – giáo viên) dùng âm bên l và âm quặt lưỡi sh.', phonemeId:'l', confusedWith:'n' },
    { id:'Q105', ch:'ch2', type:'từ vựng', hanzi:'朋友', promptVi:'Chọn pinyin đúng cho từ sau:', opts:['péngyou','béngyou','pényou','féngyou'], ans:'péngyou', explain:'朋友 (péngyou – bạn bè) dùng p bật hơi và vần mũi sau -eng.', phonemeId:'p', confusedWith:'b' },
    { id:'Q106', ch:'ch3', type:'từ vựng', hanzi:'女人', promptVi:'Chọn pinyin đúng cho từ sau:', opts:['nǚrén','nǔrén','lǚrén','nǚlén'], ans:'nǚrén', explain:'女 (nǚ) giữ hai dấu chấm trên ü; 人 (rén) đọc âm sau lợi hữu thanh r.', phonemeId:'ü', confusedWith:'u' },
    { id:'Q107', ch:'ch3', type:'từ vựng', hanzi:'很忙', promptVi:'Chọn pinyin đúng cho từ sau:', opts:['hěn máng','hěng mán','hěn mán','kěn máng'], ans:'hěn máng', explain:'很 (hěn) kết thúc mũi -n; 忙 (máng) kết thúc mũi sau -ng.', phonemeId:'en', confusedWith:'eng' },
    { id:'Q108', ch:'ch4', type:'từ vựng', hanzi:'不是', promptVi:'Chọn cách đọc đúng theo quy tắc biến điệu:', opts:['bú shì','bù shì','bǔ shì','bū shì'], ans:'bú shì', explain:'Chữ 不 (bù) đứng trước 是 (shì – thanh 4) biến điệu đọc thành bú shì.' },
    { id:'Q109', ch:'ch5', type:'từ vựng', hanzi:'再见', promptVi:'Chọn pinyin đúng cho từ sau:', opts:['zàijiàn','zhàijiàn','càijiàn','zàijiàng'], ans:'zàijiàn', explain:'再见 (zàijiàn – tạm biệt) dùng đầu lưỡi trước z và vần mũi -ian.', phonemeId:'z', confusedWith:'zh' },
    { id:'Q110', ch:'ch5', type:'từ vựng', hanzi:'吃茶', promptVi:'Chọn pinyin đúng cho cụm từ sau:', opts:['chī chá','cī cá','qī qá','zhī zhá'], ans:'chī chá', explain:'Cả 吃 (chī) và 茶 (chá) đều dùng thanh mẫu quặt lưỡi bật hơi ch.', phonemeId:'ch', confusedWith:'c' }
  ];

  const TONE_CONTOUR_LIST = [
    { tone:1, label:'Thanh 1', mark:'ā', chao:'55', desc:'Cao và đều ngang', path:'M12 12 L108 12', ex:{ zh:'妈', py:'mā', vi:'mẹ' } },
    { tone:2, label:'Thanh 2', mark:'á', chao:'35', desc:'Đi lên dứt khoát', path:'M12 36 L108 12', ex:{ zh:'麻', py:'má', vi:'cây gai' } },
    { tone:3, label:'Thanh 3', mark:'ǎ', chao:'214 / 21', desc:'Trầm xuống rồi lên (nói liên tục giữ phần thấp)', path:'M12 32 Q54 50 108 18', ex:{ zh:'马', py:'mǎ', vi:'ngựa' } },
    { tone:4, label:'Thanh 4', mark:'à', chao:'51', desc:'Rơi nhanh từ cao xuống thấp', path:'M12 10 L108 46', ex:{ zh:'骂', py:'mà', vi:'mắng' } },
    { tone:5, label:'Thanh nhẹ', mark:'a', chao:'Ngắn · nhẹ', desc:'Ngắn, nhẹ, cao độ tùy âm trước', path:'M34 28 L86 28', ex:{ zh:'吗', py:'ma', vi:'trợ từ hỏi' } }
  ];

  // Đếm tổng số bài (40 bài)
  const ALL_LESSONS = [];
  CHAPTERS.forEach(ch => {
    ch.lessons.forEach(ls => {
      ls.chapterId = ch.id;
      ls.chapterNum = ch.num;
      ls.chapterTitle = ch.title;
      ALL_LESSONS.push(ls);
    });
  });

  window.HANYU_PINYIN_DATA = {
    COURSE_ID: 'pinyin-foundation',
    VERSION: 1,
    PHONEMES,
    CHAPTERS,
    ALL_LESSONS,
    CONFUSABLE_PAIRS,
    VERIFIED_SYLLABLES,
    QUESTION_BANK,
    TONE_CONTOUR_LIST
  };
})();
