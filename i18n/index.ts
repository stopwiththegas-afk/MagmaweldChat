import { Language } from '@/context/settings';
import { useSettings } from '@/context/settings';

export const translations = {
  ru: {
    // drawer / common
    profile: 'Профиль',
    contacts: 'Контакты',
    settings: 'Настройки',
    logout: 'Выйти',
    back: '← Назад',
    err_generic: 'Произошла ошибка',

    // settings
    language: 'Язык',
    theme: 'Тема',
    lang_ru: 'Русский',
    lang_en: 'Английский',
    lang_tr: 'Турецкий',
    theme_light: 'Светлая',
    theme_dark: 'Тёмная',

    // profile
    add_photo: 'Добавить фото',
    change_photo: 'Изменить фото',
    no_access: 'Нет доступа',
    gallery_permission: 'Разрешите доступ к галерее в настройках телефона.',
    field_name: 'Имя',
    field_username: 'Логин',
    field_phone: 'Телефон',
    field_member_since: 'В системе с',

    // contacts
    contacts_search_placeholder: 'Поиск по номеру, имени или логину',
    write_btn: 'Написать',
    contacts_empty_search: 'Ничего не найдено',

    // chat menu
    clear_history: 'Очистить историю',
    delete_chat: 'Удалить чат',

    // login
    login_title: 'Вход',
    login_subtitle: 'Введите номер телефона',
    login_placeholder: '+7 (999) 123-45-67',
    continue_btn: 'Продолжить',
    err_invalid_phone: 'Введите российский номер: +7XXXXXXXXXX или 8XXXXXXXXXX',

    // verify
    verify_title: 'Код подтверждения',
    verify_subtitle: 'Код отправлен на номер',
    confirm_btn: 'Подтвердить',
    err_code_length: 'Введите 4-значный код',
    verify_telegram_link: 'Написать в Telegram',
    err_wrong_code: 'Неверный код',
    err_no_phone: 'Номер телефона не указан',

    // register
    register_title: 'Регистрация',
    register_subtitle: 'Придумайте логин и укажите имя',
    label_username: 'Логин',
    label_name: 'Имя',
    placeholder_username: '@ivan_petrov',
    placeholder_name: 'Иван Петров',
    create_account_btn: 'Создать аккаунт',
    val_enter_username: 'Введите логин',
    val_username_at: 'Логин должен начинаться с @',
    val_username_short: 'Логин слишком короткий (минимум 3 символа)',
    val_username_long: 'Логин слишком длинный (максимум 32 символа)',
    val_username_chars: 'Только латинские буквы, цифры и _',
    val_username_start_underscore: 'Логин не может начинаться с _',
    val_username_end_underscore: 'Логин не может заканчиваться на _',
    val_username_double_underscore: 'Нельзя использовать два подряд __',
    val_username_start_digit: 'Логин не может начинаться с цифры',
    val_name_short: 'Введите имя (минимум 2 символа)',
    err_username_taken: 'Этот логин уже занят',
  },

  en: {
    // drawer / common
    profile: 'Profile',
    contacts: 'Contacts',
    settings: 'Settings',
    logout: 'Log out',
    back: '← Back',
    err_generic: 'An error occurred',

    // settings
    language: 'Language',
    theme: 'Theme',
    lang_ru: 'Russian',
    lang_en: 'English',
    lang_tr: 'Turkish',
    theme_light: 'Light',
    theme_dark: 'Dark',

    // profile
    add_photo: 'Add photo',
    change_photo: 'Change photo',
    no_access: 'No access',
    gallery_permission: 'Please allow gallery access in your phone settings.',
    field_name: 'Name',
    field_username: 'Username',
    field_phone: 'Phone',
    field_member_since: 'Member since',

    // contacts
    contacts_search_placeholder: 'Search by phone, name or username',
    write_btn: 'Write',
    contacts_empty_search: 'No results found',

    // chat menu
    clear_history: 'Clear history',
    delete_chat: 'Delete chat',

    // login
    login_title: 'Login',
    login_subtitle: 'Enter your phone number',
    login_placeholder: '+7 (999) 123-45-67',
    continue_btn: 'Continue',
    err_invalid_phone: 'Enter a Russian number: +7XXXXXXXXXX or 8XXXXXXXXXX',

    // verify
    verify_title: 'Verification code',
    verify_subtitle: 'Code sent to',
    confirm_btn: 'Confirm',
    err_code_length: 'Enter a 4-digit code',
    verify_telegram_link: 'Contact on Telegram',
    err_wrong_code: 'Incorrect code',
    err_no_phone: 'Phone number not specified',

    // register
    register_title: 'Registration',
    register_subtitle: 'Choose a username and enter your name',
    label_username: 'Username',
    label_name: 'Name',
    placeholder_username: '@john_smith',
    placeholder_name: 'John Smith',
    create_account_btn: 'Create account',
    val_enter_username: 'Enter a username',
    val_username_at: 'Username must start with @',
    val_username_short: 'Username too short (min 3 chars)',
    val_username_long: 'Username too long (max 32 chars)',
    val_username_chars: 'Only Latin letters, digits, and _',
    val_username_start_underscore: 'Username cannot start with _',
    val_username_end_underscore: 'Username cannot end with _',
    val_username_double_underscore: 'Cannot use double underscores __',
    val_username_start_digit: 'Username cannot start with a digit',
    val_name_short: 'Enter your name (min 2 chars)',
    err_username_taken: 'This username is already taken',
  },

  tr: {
    // drawer / common
    profile: 'Profil',
    contacts: 'Kişiler',
    settings: 'Ayarlar',
    logout: 'Çıkış',
    back: '← Geri',
    err_generic: 'Bir hata oluştu',

    // settings
    language: 'Dil',
    theme: 'Tema',
    lang_ru: 'Rusça',
    lang_en: 'İngilizce',
    lang_tr: 'Türkçe',
    theme_light: 'Açık',
    theme_dark: 'Koyu',

    // profile
    add_photo: 'Fotoğraf ekle',
    change_photo: 'Fotoğrafı değiştir',
    no_access: 'Erişim yok',
    gallery_permission: 'Lütfen telefon ayarlarından galeri erişimine izin verin.',
    field_name: 'Ad',
    field_username: 'Kullanıcı adı',
    field_phone: 'Telefon',
    field_member_since: 'Üye tarihi',

    // contacts
    contacts_search_placeholder: 'Telefon, ad veya kullanıcı adıyla ara',
    write_btn: 'Yaz',
    contacts_empty_search: 'Sonuç bulunamadı',

    // chat menu
    clear_history: 'Geçmişi temizle',
    delete_chat: 'Sohbeti sil',

    // login
    login_title: 'Giriş',
    login_subtitle: 'Telefon numaranızı girin',
    login_placeholder: '+7 (999) 123-45-67',
    continue_btn: 'Devam et',
    err_invalid_phone: 'Rusya numarası girin: +7XXXXXXXXXX veya 8XXXXXXXXXX',

    // verify
    verify_title: 'Doğrulama kodu',
    verify_subtitle: 'Gönderilen numara',
    confirm_btn: 'Onayla',
    err_code_length: '4 haneli kodu girin',
    verify_telegram_link: 'Telegram ile iletişime geç',
    err_wrong_code: 'Hatalı kod',
    err_no_phone: 'Telefon numarası belirtilmedi',

    // register
    register_title: 'Kayıt',
    register_subtitle: 'Kullanıcı adı seçin ve adınızı girin',
    label_username: 'Kullanıcı adı',
    label_name: 'Ad',
    placeholder_username: '@ahmet_yilmaz',
    placeholder_name: 'Ahmet Yılmaz',
    create_account_btn: 'Hesap oluştur',
    val_enter_username: 'Kullanıcı adı girin',
    val_username_at: 'Kullanıcı adı @ ile başlamalı',
    val_username_short: 'Kullanıcı adı çok kısa (en az 3 karakter)',
    val_username_long: 'Kullanıcı adı çok uzun (en fazla 32 karakter)',
    val_username_chars: 'Sadece Latin harfler, rakamlar ve _',
    val_username_start_underscore: 'Kullanıcı adı _ ile başlayamaz',
    val_username_end_underscore: 'Kullanıcı adı _ ile bitemez',
    val_username_double_underscore: 'Çift alt çizgi __ kullanılamaz',
    val_username_start_digit: 'Kullanıcı adı rakamla başlayamaz',
    val_name_short: 'Adınızı girin (en az 2 karakter)',
    err_username_taken: 'Bu kullanıcı adı zaten alınmış',
  },
} satisfies Record<Language, Record<string, string>>;

export type TranslationKey = keyof typeof translations.ru;

export function t(lang: Language, key: TranslationKey): string {
  return translations[lang][key] ?? translations.ru[key];
}

export function useT() {
  const { language } = useSettings();
  return (key: TranslationKey) => t(language, key);
}
