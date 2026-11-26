from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse


class AuthenticationApiTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.user = get_user_model().objects.create_user(
            username='operador',
            password='contrasena-segura',
        )

    def csrf_token(self):
        response = self.client.get(reverse('auth-csrf'))

        self.assertEqual(response.status_code, 200)
        return response.cookies['csrftoken'].value

    def login(self, username='operador', password='contrasena-segura'):
        token = self.csrf_token()
        return self.client.post(
            reverse('auth-login'),
            {'username': username, 'password': password},
            HTTP_X_CSRFTOKEN=token,
        )

    def test_login_with_valid_credentials_creates_session(self):
        response = self.login()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['username'], self.user.username)
        self.assertIn('_auth_user_id', self.client.session)

    def test_login_with_invalid_credentials_returns_generic_error(self):
        response = self.login(password='incorrecta')

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['detail'], 'Usuario o contraseña incorrectos.')

    def test_login_rejects_inactive_user(self):
        self.user.is_active = False
        self.user.save()

        response = self.login()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['detail'], 'Usuario o contraseña incorrectos.')

    def test_login_requires_csrf_token(self):
        response = self.client.post(
            reverse('auth-login'),
            {'username': self.user.username, 'password': 'contrasena-segura'},
        )

        self.assertEqual(response.status_code, 403)

    def test_me_requires_authentication(self):
        response = self.client.get(reverse('auth-me'))

        self.assertEqual(response.status_code, 403)

    def test_me_returns_authenticated_user_and_session_persists(self):
        self.login()

        first_response = self.client.get(reverse('auth-me'))
        second_response = self.client.get(reverse('auth-me'))

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(second_response.json()['username'], self.user.username)

    def test_logout_requires_csrf_and_invalidates_session(self):
        self.login()

        rejected_response = self.client.post(reverse('auth-logout'))
        token = self.client.cookies['csrftoken'].value
        logout_response = self.client.post(reverse('auth-logout'), HTTP_X_CSRFTOKEN=token)
        me_response = self.client.get(reverse('auth-me'))

        self.assertEqual(rejected_response.status_code, 403)
        self.assertEqual(logout_response.status_code, 204)
        self.assertEqual(me_response.status_code, 403)
