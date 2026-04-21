const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const { Strategy: GitHubStrategy } = require("passport-github2");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const User = require("../models/user.model");
const logger = require("../utils/logger");

//JWT Strategy 
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    },
    async (payload, done) => {
      try {
        const user = await User.findById(payload.sub).select("-password");
        if (!user || !user.isActive) {
          return done(null, false);
        }
        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

//Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.APP_URL}/api/v1/auth/google/callback`,
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ oauthProvider: "google", oauthId: profile.id });

          if (!user) {
            // Check if email already registered locally
            user = await User.findOne({ email: profile.emails[0].value });
            if (user) {
              // Link OAuth to existing account
              user.oauthProvider = "google";
              user.oauthId = profile.id;
              user.isEmailVerified = true;
              await user.save();
            } else {
              // Create new user
              user = await User.create({
                name: profile.displayName,
                email: profile.emails[0].value,
                oauthProvider: "google",
                oauthId: profile.id,
                isEmailVerified: true,
                avatar: profile.photos?.[0]?.value,
              });
            }
          }

          return done(null, user);
        } catch (err) {
          logger.error(`Google OAuth error: ${err.message}`);
          return done(err, false);
        }
      }
    )
  );
}

//GitHub OAuth Strategy 
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${process.env.APP_URL}/api/v1/auth/github/callback`,
        scope: ["user:email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email =
            profile.emails?.[0]?.value || `${profile.username}@github.com`;

          let user = await User.findOne({ oauthProvider: "github", oauthId: profile.id });

          if (!user) {
            user = await User.findOne({ email });
            if (user) {
              user.oauthProvider = "github";
              user.oauthId = profile.id;
              user.isEmailVerified = true;
              await user.save();
            } else {
              user = await User.create({
                name: profile.displayName || profile.username,
                email,
                oauthProvider: "github",
                oauthId: String(profile.id),
                isEmailVerified: true,
                avatar: profile.photos?.[0]?.value,
              });
            }
          }

          return done(null, user);
        } catch (err) {
          logger.error(`GitHub OAuth error: ${err.message}`);
          return done(err, false);
        }
      }
    )
  );
}
