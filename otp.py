import random
import smtplib
from email.mime.text import MIMEText

def generate_otp():
    return str(random.randint(100000, 999999))


def send_otp(email, otp):
    sender = "your_email@gmail.com"
    password = "your_app_password"  # ⚠️ use app password

    msg = MIMEText(f"Your OTP is: {otp}")
    msg["Subject"] = "AI Study Helper OTP"
    msg["From"] = sender
    msg["To"] = email

    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.starttls()
    server.login(sender, password)
    server.send_message(msg)
    server.quit()