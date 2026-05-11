#!/usr/bin/env python
"""
Verify Market Data Fix
======================
Bu script piyasa verilerinin doğru çekilip çekilmediğini kontrol eder.
"""

import requests
import time

def test_endpoint():
    """Test the backend endpoint"""
    print("=" * 60)
    print("BACKEND ENDPOINT TEST")
    print("=" * 60)
    
    try:
        url = 'http://localhost:5000/api/market/coingecko-markets?page=1&per_page=10'
        print(f"\nTesting: {url}")
        
        res = requests.get(url, timeout=10)
        print(f"Status Code: {res.status_code}")
        
        if res.status_code == 200:
            data = res.json()
            print(f"✅ SUCCESS: Received {len(data)} coins")
            
            if len(data) > 0:
                coin = data[0]
                print(f"\n📊 Sample Coin: {coin.get('name')} ({coin.get('symbol', '').upper()})")
                print(f"   Price: ${coin.get('current_price', 0):,.2f}")
                print(f"   Market Cap: ${coin.get('market_cap', 0):,.0f}")
                print(f"   Volume: ${coin.get('total_volume', 0):,.0f}")
                print(f"   24h Change: {coin.get('price_change_percentage_24h', 0):.2f}%")
                print(f"   7d Change: {coin.get('price_change_percentage_7d_in_currency', 0):.2f}%")
                
                # Verify required fields
                required_fields = ['current_price', 'market_cap', 'total_volume', 
                                 'price_change_percentage_24h', 'price_change_percentage_7d_in_currency']
                missing = [f for f in required_fields if coin.get(f) is None]
                
                if missing:
                    print(f"\n⚠️  WARNING: Missing fields: {', '.join(missing)}")
                else:
                    print(f"\n✅ All required fields present!")
                
                return True
        elif res.status_code == 404:
            print("❌ ERROR: Endpoint not found (404)")
            print("   → Flask server needs to be restarted!")
            print("   → Run: python main.py")
            return False
        elif res.status_code == 429:
            print("⚠️  WARNING: Rate limit hit (429)")
            print("   → CoinGecko API rate limit")
            print("   → Wait 5-10 minutes and try again")
            print("   → Or check if cache is working")
            return False
        else:
            print(f"❌ ERROR: Unexpected status code {res.status_code}")
            try:
                error_data = res.json()
                print(f"   Error: {error_data}")
            except:
                print(f"   Response: {res.text[:200]}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Cannot connect to server")
        print("   → Is Flask server running?")
        print("   → Run: python main.py")
        return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_binance_endpoint():
    """Test Binance ticker endpoint"""
    print("\n" + "=" * 60)
    print("BINANCE TICKER TEST")
    print("=" * 60)
    
    try:
        url = 'http://localhost:5000/api/market/binance-ticker'
        print(f"\nTesting: {url}")
        
        res = requests.get(url, timeout=10)
        print(f"Status Code: {res.status_code}")
        
        if res.status_code == 200:
            data = res.json()
            print(f"✅ SUCCESS: Received {len(data)} tickers")
            
            # Find BTCUSDT
            btc = next((t for t in data if t['symbol'] == 'BTCUSDT'), None)
            if btc:
                print(f"\n📊 BTC/USDT:")
                print(f"   Price: ${float(btc.get('lastPrice', 0)):,.2f}")
                print(f"   24h Change: {float(btc.get('priceChangePercent', 0)):.2f}%")
                print(f"   Volume: ${float(btc.get('quoteVolume', 0)):,.0f}")
            
            return True
        else:
            print(f"❌ ERROR: Status {res.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def main():
    print("\n🔍 TB Trading Bot - Market Data Verification")
    print("=" * 60)
    
    # Test endpoints
    coingecko_ok = test_endpoint()
    time.sleep(1)
    binance_ok = test_binance_endpoint()
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    if coingecko_ok and binance_ok:
        print("✅ All tests passed!")
        print("\nNext steps:")
        print("1. Open browser and go to http://localhost:5000")
        print("2. Navigate to Markets page")
        print("3. Open browser console (F12)")
        print("4. Check for '[MARKET CAPS]' logs")
        print("5. Verify data is displayed correctly")
    else:
        print("❌ Some tests failed")
        print("\nTroubleshooting:")
        if not coingecko_ok:
            print("- Restart Flask server: python main.py")
            print("- Check server logs for errors")
        if not binance_ok:
            print("- Check Binance API connectivity")
        print("\nFor more help, see: FIX_MARKET_DATA.md")
    
    print("=" * 60)

if __name__ == "__main__":
    main()
