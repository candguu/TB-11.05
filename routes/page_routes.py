import os
from datetime import datetime
from flask import Blueprint, jsonify, send_file, render_template, request

page_bp = Blueprint("page", __name__)

@page_bp.route("/")
def index():
    return render_template("index.html")

@page_bp.route("/markets")
def markets():
    return render_template("markets.html")

@page_bp.route("/blog")
def blog():
    return render_template("blog.html")

@page_bp.route("/blog/ml-trading")
def blog_ml_trading():
    return render_template("blog_ml_trading.html")

@page_bp.route("/blog/risk-management")
def blog_risk_management():
    return render_template("blog_risk_management.html")

@page_bp.route("/blog/api-limits")
def blog_api_limits():
    return render_template("blog_api_limits.html")

@page_bp.route("/blog/trading-psychology")
def blog_trading_psychology():
    return render_template("blog_trading_psychology.html")

@page_bp.route("/blog/testnet")
def blog_testnet():
    return render_template("blog_testnet.html")

@page_bp.route("/blog/grid-trading")
def blog_grid_trading():
    return render_template("blog_grid_trading.html")

@page_bp.route("/blog/compound-interest")
def blog_compound_interest():
    return render_template("blog_compound_interest.html")

@page_bp.route("/strateji")
def strategy():
    return render_template("strategy.html")

@page_bp.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")

@page_bp.route("/docs")
def docs():
    return render_template("docs.html")

@page_bp.route("/api-referans")
def api_referans():
    return render_template("api_referans.html")

@page_bp.route("/destek")
def destek():
    return render_template("destek.html")

@page_bp.route("/kullanim-sartlari")
def kullanim_sartlari():
    return render_template("kullanim_sartlari.html")

@page_bp.route("/gizlilik-politikasi")
def gizlilik_politikasi():
    return render_template("gizlilik_politikasi.html")

@page_bp.route("/verify-email")
def verify_email_page():
    token = request.args.get("token", "")
    return render_template("verify_email.html", token=token)

@page_bp.route("/logo.png")
def serve_logo():
    base_dir = os.path.dirname(os.path.dirname(__file__))
    p = os.path.join(base_dir, "static", "logo", "logo-beyaz.png")
    if not os.path.exists(p):
        p = os.path.join(base_dir, "static", "logo", "logo-siyah.png")
    return send_file(p, mimetype="image/png") if os.path.exists(p) else ("", 404)

@page_bp.route("/api/health")
def health():
    return jsonify({"status":"ok","time":datetime.now().isoformat(),"version":"3.4.0"})
