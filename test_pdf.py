import os
import requests

url = "http://localhost:8001/api/export"

payload = {
    "format": "pdf",
    "title": "LOG LET'S HAVE A DEBATE",
    "tier": "GOD",
    "messages": [
        {
            "role": "user",
            "content": "Let's have a debate on whether the Detroit Lions will win Super Bowl LXI. Give me your most tactical breakdown, analyzing Vegas odds, roster structures, and specific threats."
        },
        {
            "role": "assistant",
            "stage1": [
                {
                    "model": "gemini-3.5-flash",
                    "response": "The Detroit Lions are in a prime position for a Super Bowl LXI run. Their roster foundation is built around a dominant offensive line and an explosive play-action scheme engineered by Ben Johnson. \n\n**Core Strength Indicators:**\n- **Offensive Symmetry:** Jared Goff thrives behind a clean pocket. With Jahmyr Gibbs and David Montgomery providing a dual-headed ground assault, they can control the tempo of any game.\n- **Defensive Upside:** Aidan Hutchinson provides elite edge-rush value, consistently forcing quarterbacks into hurried decisions.\n\nHowever, dynasty fatigue is a factor, and the road through the NFC requires outplaying the Rams and Seahawks."
                }
            ],
            "stage2": [
                {
                    "model": "claude-3-opus",
                    "response": "PEER REVIEW PROTOCOL // INITIATED.\n\nWhile the offensive line is elite, the argument overlooks crucial defensive secondary regression:\n- **Secondary Vulnerability:** Even with recent acquisitions, their coverage grading against elite tier-1 vertical threats remains volatile.\n- **Vegas Implied Probability:** The market has the Rams and Seahawks priced slightly shorter due to historical playoff conversion rates.\n\nWe must treat this like a high-pressure case file. If the Lions stay healthy, they are the safest NFC floor. But 'Mahomes wins forever' groupthink is the real monster waiting in the AFC gauntlet."
                }
            ],
            "stage3": {
                "response": "STAGE 3 — THE ARBITER'S JUDGEMENT\n\nAfter synthesizing the rapid response from Gemini 3.5 Flash and the rigorous peer review from Claude 3 Opus, the Arbiter has arrived at a final directive.\n\n**Synthesized Verdict:**\nThe Detroit Lions have a highly balanced blueprint, but their championship ceiling will be determined entirely by situational defensive consistency in third-down packages. The AFC champion (whether it is the Chiefs, Ravens, or Bills) will exploit any coverage lapse. \n\nSUGGESTED PROMPT IMPROVEMENT: Analyze the Detroit Lions' defensive secondary acquisitions for the 2026-27 season, focusing on nickel and dime coverage packages against Chiefs style mesh concepts."
            }
        }
    ]
}

print("Sending request to export API...")
try:
    response = requests.post(url, json=payload, timeout=10)
    if response.status_code == 200:
        output_path = os.path.expanduser(r"~\Downloads\LOG_CINEMATIC_DOSSIER_UPGRADED.pdf")
        with open(output_path, "wb") as f:
            f.write(response.content)
        print(f"SUCCESS! Beautiful cinematic PDF generated at: {output_path}")
        print("File size:", len(response.content), "bytes")
    else:
        print(f"Error from server (Status {response.status_code}):", response.text)
except Exception as e:
    print("API request failed:", e)
